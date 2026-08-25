import VideoArchivePlayer
  from '../components/VideoArchivePlayer'


function IllusioPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Illusio"
      apiEndpoint="/api/library/illusio"
      returnPath="/illusio"
      playerPath="/illusio/watch"
    />

  )

}


export default IllusioPlayerPage