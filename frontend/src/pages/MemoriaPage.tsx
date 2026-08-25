import VideoArchivePage from '../components/VideoArchivePage'


function MemoriaPage() {

  return (

    <VideoArchivePage
      title="Memoria"
      apiEndpoint="/api/library/memoria"
      playerPath="/memoria/watch"
      returnPath="/"
      allowEditing={true}
    />

  )

}


export default MemoriaPage