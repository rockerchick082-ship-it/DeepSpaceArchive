import VideoArchivePlayer from '../components/VideoArchivePlayer'


function MythsPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Myths"
      apiEndpoint="/api/library/myths"
      returnPath="/myths"
      playerPath="/myths/watch"
    />

  )

}


export default MythsPlayerPage