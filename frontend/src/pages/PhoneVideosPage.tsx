import PhoneArchivePage
  from '../components/PhoneArchivePage'


function PhoneVideosPage() {

  return (

    <PhoneArchivePage
      title="Video Calls"
      eyebrow="PHONE · VIDEO"
      endpoint="/api/library/phone-videos"
      category="Phone Video"
    />

  )

}


export default PhoneVideosPage