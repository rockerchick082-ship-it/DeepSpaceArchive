import VideoArchivePlayer from '../components/VideoArchivePlayer'


function TenderMomentsPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Tender Moments"
      apiEndpoint="/api/library/tender-moments"
      returnPath="/tender-moments"
      playerPath="/tender-moments/watch"
    />

  )

}


export default TenderMomentsPlayerPage