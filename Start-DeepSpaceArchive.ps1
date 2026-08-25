param(
  [switch]$NoBrowser
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot "runtime"
$BackendRoot = Join-Path $ProjectRoot "backend"
$FrontendRoot = Join-Path $ProjectRoot "frontend"

$BackendUrl = "http://localhost:3001"
$DeveloperFrontendUrl = "http://localhost:5173"

$backendProcess = $null
$frontendProcess = $null


# ------------------------------------------------------------
# Windows Job Object
# ------------------------------------------------------------
#
# Closing a console window can terminate PowerShell before its
# finally block has time to stop npm/node child processes.
#
# A Windows Job Object with KILL_ON_JOB_CLOSE fixes that at the
# operating-system level: every backend/frontend process attached
# to the job, plus their descendants, is automatically terminated
# when this launcher exits or its window is closed.
#
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class DeepSpaceArchiveJob
{
    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_BASIC_LIMIT_INFORMATION
    {
        public long PerProcessUserTimeLimit;
        public long PerJobUserTimeLimit;
        public uint LimitFlags;
        public UIntPtr MinimumWorkingSetSize;
        public UIntPtr MaximumWorkingSetSize;
        public uint ActiveProcessLimit;
        public UIntPtr Affinity;
        public uint PriorityClass;
        public uint SchedulingClass;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct IO_COUNTERS
    {
        public ulong ReadOperationCount;
        public ulong WriteOperationCount;
        public ulong OtherOperationCount;
        public ulong ReadTransferCount;
        public ulong WriteTransferCount;
        public ulong OtherTransferCount;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
    {
        public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
        public IO_COUNTERS IoInfo;
        public UIntPtr ProcessMemoryLimit;
        public UIntPtr JobMemoryLimit;
        public UIntPtr PeakProcessMemoryUsed;
        public UIntPtr PeakJobMemoryUsed;
    }

    const int JobObjectExtendedLimitInformation = 9;
    const uint JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE = 0x00002000;

    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)]
    static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

    [DllImport("kernel32.dll")]
    static extern bool SetInformationJobObject(
        IntPtr hJob,
        int JobObjectInfoClass,
        IntPtr lpJobObjectInfo,
        uint cbJobObjectInfoLength
    );

    [DllImport("kernel32.dll")]
    static extern bool AssignProcessToJobObject(
        IntPtr hJob,
        IntPtr hProcess
    );

    [DllImport("kernel32.dll")]
    static extern bool CloseHandle(IntPtr hObject);

    public static IntPtr CreateKillOnCloseJob()
    {
        IntPtr job = CreateJobObject(IntPtr.Zero, null);

        if (job == IntPtr.Zero)
            throw new InvalidOperationException("Unable to create Windows Job Object.");

        var info = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
        info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;

        int length = Marshal.SizeOf(info);
        IntPtr pointer = Marshal.AllocHGlobal(length);

        try
        {
            Marshal.StructureToPtr(info, pointer, false);

            if (!SetInformationJobObject(
                job,
                JobObjectExtendedLimitInformation,
                pointer,
                (uint)length
            ))
            {
                CloseHandle(job);
                throw new InvalidOperationException(
                    "Unable to configure Windows Job Object."
                );
            }
        }
        finally
        {
            Marshal.FreeHGlobal(pointer);
        }

        return job;
    }

    public static void AddProcess(IntPtr job, IntPtr processHandle)
    {
        if (!AssignProcessToJobObject(job, processHandle))
        {
            throw new InvalidOperationException(
                "Unable to attach child process to Windows Job Object."
            );
        }
    }

    public static void CloseJob(IntPtr job)
    {
        if (job != IntPtr.Zero)
            CloseHandle(job);
    }
}
"@


$processJob =
  [DeepSpaceArchiveJob]::CreateKillOnCloseJob()


function Add-ProcessToLauncherJob {
  param(
    [System.Diagnostics.Process]$Process
  )

  if (
    $null -eq
      $Process
  ) {

    return

  }


  [DeepSpaceArchiveJob]::AddProcess(
    $processJob,
    $Process.Handle
  )

}

function Write-Step {
  param([string]$Message)

  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Fail {
  param([string]$Message)

  Write-Host ""
  Write-Host "ERROR: $Message" -ForegroundColor Red
  Write-Host ""
  Read-Host "Press Enter to close"
  exit 1
}

function Wait-Http {
  param(
    [string]$Url,
    [int]$TimeoutSeconds = 90
  )

  $deadline =
    (Get-Date).AddSeconds(
      $TimeoutSeconds
    )

  while (
    (Get-Date) -lt
      $deadline
  ) {

    try {

      $response =
        Invoke-WebRequest `
          -Uri $Url `
          -UseBasicParsing `
          -TimeoutSec 3 `
          -ErrorAction Stop


      if (
        $response.StatusCode -ge
          200 -and
        $response.StatusCode -lt
          500
      ) {

        return $true

      }

    } catch {

      Start-Sleep `
        -Milliseconds 750

    }

  }


  return $false
}

function Stop-ProcessTree {
  param(
    [System.Diagnostics.Process]$Process
  )

  if (
    $null -eq
      $Process
  ) {

    return

  }


  try {

    if (
      $Process.HasExited
    ) {

      return

    }

  } catch {

    return

  }


  try {

    <#
      taskkill /T is important in developer mode:

      npm.cmd -> cmd.exe -> node.exe

      Stopping only the npm/cmd parent can leave Vite or the
      backend Node process listening on ports 5173/3001.
    #>
    & taskkill.exe `
      /PID $Process.Id `
      /T `
      /F `
      *> $null

  } catch {

    try {

      Stop-Process `
        -Id $Process.Id `
        -Force `
        -ErrorAction SilentlyContinue

    } catch {

      # Best-effort shutdown.

    }

  }

}


function Stop-ChildProcesses {

  <#
    Stop the frontend tree first, then the backend tree.
    Production mode normally has only the backend process.
  #>
  Stop-ProcessTree `
    -Process $frontendProcess


  Stop-ProcessTree `
    -Process $backendProcess

}


if (
  -not (
    Test-Path `
      -LiteralPath $BackendRoot
  )
) {

  Fail "Backend folder is missing: $BackendRoot"

}


if (
  -not (
    Test-Path `
      -LiteralPath $FrontendRoot
  )
) {

  Fail "Frontend folder is missing: $FrontendRoot"

}


$bundledNode =
  Join-Path `
    $RuntimeRoot `
    "node.exe"


$UseBundledRuntime =
  Test-Path `
    -LiteralPath $bundledNode


if ($UseBundledRuntime) {

  $nodeExe =
    $bundledNode

  $env:PATH =
    "$RuntimeRoot;$env:PATH"

  $LaunchMode =
    "installed"

}
else {

  $nodeCommand =
    Get-Command `
      node `
      -ErrorAction SilentlyContinue


  $npmCommand =
    Get-Command `
      npm.cmd `
      -ErrorAction SilentlyContinue


  if (
    $null -eq
      $npmCommand
  ) {

    $npmCommand =
      Get-Command `
        npm `
        -ErrorAction SilentlyContinue

  }


  if (
    $null -eq $nodeCommand -or
    $null -eq $npmCommand
  ) {

    Fail @"
No bundled Node.js runtime was found and Node.js/npm are not available on PATH.

Source/developer mode requires Node.js to be installed.
The public Windows installer includes its own private Node.js runtime.
"@

  }


  $nodeExe =
    $nodeCommand.Source

  $npmExe =
    $npmCommand.Source

  $LaunchMode =
    "developer"

}


if (
  $LaunchMode -eq
    "installed"
) {

  $LocalAppDataRoot =
    Join-Path `
      $env:LOCALAPPDATA `
      "DeepSpaceArchive"


  $PersistentData =
    Join-Path `
      $LocalAppDataRoot `
      "data"


  $PersistentCache =
    Join-Path `
      $LocalAppDataRoot `
      "cache"


  New-Item `
    -ItemType Directory `
    -Force `
    -Path $PersistentData |
    Out-Null


  New-Item `
    -ItemType Directory `
    -Force `
    -Path $PersistentCache |
    Out-Null


  # One-time migration from early installer builds that stored
  # mutable state under backend\data.
  $LegacyData =
    Join-Path `
      $BackendRoot `
      "data"


  $newDataHasFiles =
    (
      Get-ChildItem `
        -LiteralPath $PersistentData `
        -Force `
        -ErrorAction SilentlyContinue |
      Select-Object `
        -First 1
    ) -ne
      $null


  $legacyDataHasFiles =
    (
      Test-Path `
        -LiteralPath $LegacyData
    ) -and
    (
      (
        Get-ChildItem `
          -LiteralPath $LegacyData `
          -Force `
          -ErrorAction SilentlyContinue |
        Select-Object `
          -First 1
      ) -ne
        $null
    )


  if (
    -not $newDataHasFiles -and
    $legacyDataHasFiles
  ) {

    Write-Step "Migrating existing application data"


    Copy-Item `
      -Path (
        Join-Path `
          $LegacyData `
          "*"
      ) `
      -Destination $PersistentData `
      -Recurse `
      -Force


    Write-Host `
      "Existing data migrated to $PersistentData" `
      -ForegroundColor Green

  }


  $env:DEEPSPACE_ARCHIVE_DATA_DIR =
    $PersistentData

  $env:DEEPSPACE_ARCHIVE_CACHE_DIR =
    $PersistentCache

  $env:DEEPSPACE_ARCHIVE_FRONTEND_DIR =
    Join-Path `
      $FrontendRoot `
      "dist"

  $env:DEEPSPACE_ARCHIVE_SERVE_FRONTEND =
    "true"


  # Release metadata is generated by GitHub Actions and included
  # beside this launcher in normal Windows installer builds.
  $ReleaseMetadataPath =
    Join-Path `
      $ProjectRoot `
      "release-metadata.json"


  if (
    Test-Path `
      -LiteralPath $ReleaseMetadataPath
  ) {

    try {

      $ReleaseMetadata =
        Get-Content `
          -LiteralPath $ReleaseMetadataPath `
          -Raw |
        ConvertFrom-Json


      if (
        -not [string]::IsNullOrWhiteSpace(
          [string]$ReleaseMetadata.version
        )
      ) {

        $env:DEEPSPACE_ARCHIVE_VERSION =
          [string]$ReleaseMetadata.version

      }


      if (
        -not [string]::IsNullOrWhiteSpace(
          [string]$ReleaseMetadata.channel
        )
      ) {

        $env:DEEPSPACE_ARCHIVE_CHANNEL =
          [string]$ReleaseMetadata.channel

      }


      if (
        -not [string]::IsNullOrWhiteSpace(
          [string]$ReleaseMetadata.commit
        )
      ) {

        $env:DEEPSPACE_ARCHIVE_COMMIT =
          [string]$ReleaseMetadata.commit

      }


      if (
        -not [string]::IsNullOrWhiteSpace(
          [string]$ReleaseMetadata.buildDate
        )
      ) {

        $env:DEEPSPACE_ARCHIVE_BUILD_DATE =
          [string]$ReleaseMetadata.buildDate

      }

    } catch {

      Write-Host `
        "Warning: release metadata could not be loaded." `
        -ForegroundColor Yellow

    }

  }


  $FrontendUrl =
    $BackendUrl

}
else {

  # Developer mode keeps the source-tree defaults and Vite.
  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_DATA_DIR `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_CACHE_DIR `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_FRONTEND_DIR `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_SERVE_FRONTEND `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_VERSION `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_CHANNEL `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_COMMIT `
    -ErrorAction SilentlyContinue

  Remove-Item `
    Env:DEEPSPACE_ARCHIVE_BUILD_DATE `
    -ErrorAction SilentlyContinue


  $FrontendUrl =
    $DeveloperFrontendUrl

}


Write-Host ""
Write-Host "DeepSpace Archive" -ForegroundColor White
Write-Host "Windows application launcher" -ForegroundColor DarkGray
Write-Host "Mode: $LaunchMode" -ForegroundColor DarkGray


if (
  $LaunchMode -eq
    "installed"
) {

  Write-Host `
    "Data: $env:DEEPSPACE_ARCHIVE_DATA_DIR" `
    -ForegroundColor DarkGray

  Write-Host `
    "Cache: $env:DEEPSPACE_ARCHIVE_CACHE_DIR" `
    -ForegroundColor DarkGray

  Write-Host `
    "Frontend: production build" `
    -ForegroundColor DarkGray

}
else {

  Write-Host `
    "Node: $nodeExe" `
    -ForegroundColor DarkGray

  Write-Host `
    "Frontend: Vite development server" `
    -ForegroundColor DarkGray

}


Write-Step "Starting backend"


if (
  $LaunchMode -eq
    "installed"
) {

  $compiledServer =
    Join-Path `
      $BackendRoot `
      "dist\server.js"


  if (
    -not (
      Test-Path `
        -LiteralPath $compiledServer
    )
  ) {

    Fail "Compiled backend is missing: $compiledServer"

  }


  if (
    -not (
      Test-Path `
        -LiteralPath $env:DEEPSPACE_ARCHIVE_FRONTEND_DIR
    )
  ) {

    Fail "Compiled frontend is missing: $env:DEEPSPACE_ARCHIVE_FRONTEND_DIR"

  }


  $backendProcess =
    Start-Process `
      -FilePath $nodeExe `
      -ArgumentList @(
        $compiledServer
      ) `
      -WorkingDirectory $BackendRoot `
      -PassThru `
      -WindowStyle Hidden


  Add-ProcessToLauncherJob `
    -Process $backendProcess

}
else {

  $backendProcess =
    Start-Process `
      -FilePath $npmExe `
      -ArgumentList @(
        "run",
        "dev"
      ) `
      -WorkingDirectory $BackendRoot `
      -PassThru `
      -WindowStyle Hidden


  Add-ProcessToLauncherJob `
    -Process $backendProcess

}


if (
  -not (
    Wait-Http `
      -Url "$BackendUrl/api/health" `
      -TimeoutSeconds 90
  )
) {

  Stop-ChildProcesses

  Fail "The backend did not become ready at $BackendUrl/api/health."

}


Write-Host "Backend ready." -ForegroundColor Green


if (
  $LaunchMode -eq
    "developer"
) {

  Write-Step "Starting frontend"


  $frontendProcess =
    Start-Process `
      -FilePath $npmExe `
      -ArgumentList @(
        "run",
        "dev",
        "--",
        "--host",
        "localhost"
      ) `
      -WorkingDirectory $FrontendRoot `
      -PassThru `
      -WindowStyle Hidden


  Add-ProcessToLauncherJob `
    -Process $frontendProcess


  if (
    -not (
      Wait-Http `
        -Url $FrontendUrl `
        -TimeoutSeconds 90
    )
  ) {

    Stop-ChildProcesses

    Fail "The frontend did not become ready at $FrontendUrl."

  }


  Write-Host "Frontend ready." -ForegroundColor Green

}
else {

  if (
    -not (
      Wait-Http `
        -Url $FrontendUrl `
        -TimeoutSeconds 30
    )
  ) {

    Stop-ChildProcesses

    Fail "The packaged frontend did not become ready at $FrontendUrl."

  }


  Write-Host "Production frontend ready." -ForegroundColor Green

}


if (
  -not $NoBrowser
) {

  Start-Process `
    $FrontendUrl

}


Write-Host ""
Write-Host "DeepSpace Archive is running." -ForegroundColor Green
Write-Host "Open: $FrontendUrl"
Write-Host "This launcher can remain minimized."
Write-Host "Closing it will stop the local app."
Write-Host ""


try {

  while ($true) {

    if (
      $backendProcess.HasExited
    ) {

      throw "The backend stopped unexpectedly."

    }


    if (
      $LaunchMode -eq
        "developer" -and
      $frontendProcess.HasExited
    ) {

      throw "The frontend stopped unexpectedly."

    }


    Start-Sleep `
      -Seconds 2

  }

}
catch {

  Write-Host ""
  Write-Host `
    $_.Exception.Message `
    -ForegroundColor Yellow

}
finally {

  Stop-ChildProcesses


  if (
    $processJob -ne
      [IntPtr]::Zero
  ) {

    [DeepSpaceArchiveJob]::CloseJob(
      $processJob
    )

    $processJob =
      [IntPtr]::Zero

  }

}
