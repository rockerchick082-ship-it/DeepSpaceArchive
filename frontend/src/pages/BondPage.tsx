import VideoArchivePage from '../components/VideoArchivePage'


function BondPage() {

  return (

    <VideoArchivePage
      title="Bond"
      apiEndpoint="/api/library/bond"
      playerPath="/bond/watch"
      returnPath="/"
      allowEditing={true}
    />

  )

}


export default BondPage