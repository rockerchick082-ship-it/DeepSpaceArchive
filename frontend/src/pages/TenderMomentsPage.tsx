import VideoArchivePage from '../components/VideoArchivePage'


function TenderMomentsPage() {

  return (

    <VideoArchivePage
      title="Tender Moments"
      apiEndpoint="/api/library/tender-moments"
      playerPath="/tender-moments/watch"
      returnPath="/"
      allowEditing={true}
    />

  )

}


export default TenderMomentsPage