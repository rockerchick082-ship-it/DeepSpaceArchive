import {
  Link,
} from 'react-router-dom'


function PhonePage() {

  return (

    <main className="archive-page">

      <header className="archive-page-header">

        <Link
          to="/"
          className="back-button"
        >
          ‹
        </Link>


        <div>

          <span className="archive-eyebrow">
            DEEPSPACE ARCHIVE
          </span>

          <h1>
            Phone
          </h1>

        </div>

      </header>


      <section className="phone-page-content">

        <div className="phone-page-intro">

          <span className="archive-eyebrow">
            COMMUNICATIONS
          </span>

          <h2>
            Choose a collection
          </h2>

          <p>
            Browse recorded phone calls
            and video calls by character.
          </p>

        </div>


        <div className="phone-collection-grid">

          <Link
            to="/phone/calls"
            className="phone-collection-card"
          >

            <div className="phone-collection-icon">
              ☎
            </div>


            <div>

              <span className="archive-eyebrow">
                AUDIO CALLS
              </span>

              <h2>
                Phone Calls
              </h2>

              <p>
                Character phone-call recordings
                preserved as video files with
                subtitles.
              </p>

            </div>


            <span className="phone-collection-arrow">
              ›
            </span>

          </Link>


          <Link
            to="/phone/videos"
            className="phone-collection-card"
          >

            <div className="phone-collection-icon">
              ▣
            </div>


            <div>

              <span className="archive-eyebrow">
                VIDEO CALLS
              </span>

              <h2>
                Video Calls
              </h2>

              <p>
                Character video-call recordings
                stored separately from standard
                phone calls.
              </p>

            </div>


            <span className="phone-collection-arrow">
              ›
            </span>

          </Link>

        </div>

      </section>

    </main>

  )

}


export default PhonePage