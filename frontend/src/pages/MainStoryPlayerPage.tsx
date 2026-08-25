import VideoArchivePlayer
  from '../components/VideoArchivePlayer'


function MainStoryPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Main Story"
      apiEndpoint="/api/library/main-story/sequence"
      returnPath="/main-story"
      playerPath="/main-story/watch"
      sequenceMode
    />

  )

}


export default MainStoryPlayerPage