import VideoArchivePlayer from '../components/VideoArchivePlayer'


function BondPlayerPage() {

  return (

    <VideoArchivePlayer
      categoryLabel="Bond"
      apiEndpoint="/api/library/bond"
      returnPath="/bond"
      playerPath="/bond/watch"
    />

  )

}


export default BondPlayerPage