import VideoArchivePage from '../components/VideoArchivePage'


function SecretTimesPage() {

  return (

    <VideoArchivePage
      title="Secret Times"
      apiEndpoint="/api/library/secret-times"
      playerPath="/secret-times/watch"
      returnPath="/"
      allowEditing={true}
    />

  )

}


export default SecretTimesPage