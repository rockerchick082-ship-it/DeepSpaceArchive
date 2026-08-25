import VideoArchivePage from '../components/VideoArchivePage'


function MythsPage() {

  return (

    <VideoArchivePage
      title="Myths"
      apiEndpoint="/api/library/myths"
      playerPath="/myths/watch"
      returnPath="/"
      allowEditing={true}
    />

  )

}


export default MythsPage