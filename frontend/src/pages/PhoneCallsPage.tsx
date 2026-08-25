import PhoneArchivePage
  from '../components/PhoneArchivePage'


function PhoneCallsPage() {

  return (

    <PhoneArchivePage
      title="Phone Calls"
      eyebrow="PHONE · CALLS"
      endpoint="/api/library/phone-calls"
      category="Phone Call"
    />

  )

}


export default PhoneCallsPage