import VideoArchivePlayer from '../components/VideoArchivePlayer'


function MemoryPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Memoria"
      apiEndpoint="/api/library/memoria"
      returnPath="/memoria"
      playerPath="/memoria/watch"
    />

  )

}


export default MemoryPlayerPage