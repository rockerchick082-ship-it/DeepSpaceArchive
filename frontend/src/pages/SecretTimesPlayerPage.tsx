import VideoArchivePlayer from '../components/VideoArchivePlayer'


function SecretTimesPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Secret Times"
      apiEndpoint="/api/library/secret-times"
      returnPath="/secret-times"
      playerPath="/secret-times/watch"
    />

  )

}


export default SecretTimesPlayerPage