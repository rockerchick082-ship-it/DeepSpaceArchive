import {
  useSearchParams,
} from 'react-router-dom'

import VideoArchivePlayer
  from '../components/VideoArchivePlayer'


function PhonePlayerPage() {

  const [
    searchParams,
  ] =
    useSearchParams()


  const category =
    searchParams.get(
      'category'
    )


  /*
   * =====================================
   * VIDEO CALL
   * =====================================
   */

  if (
    category ===
    'Phone Video'
  ) {

    return (

      <VideoArchivePlayer
        categoryLabel="Phone Video"
        apiEndpoint="/api/library/phone-videos"
        returnPath="/phone/videos"
        playerPath="/phone/watch"
      />

    )

  }


  /*
   * =====================================
   * PHONE CALL
   * =====================================
   */

  return (

    <VideoArchivePlayer
      categoryLabel="Phone Call"
      apiEndpoint="/api/library/phone-calls"
      returnPath="/phone/calls"
      playerPath="/phone/watch"
    />

  )

}


export default PhonePlayerPage