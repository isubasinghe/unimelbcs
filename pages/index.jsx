import Head from 'next/head'
import Image from 'next/image'
import signatures from '../signatures'

export async function getStaticProps(context) {
  return {
    props: {signatures}
  }
}

const UniTable = () => { 
  return <table>
      <caption>Comparison of CS subjects</caption>
        <tr>
          <td></td>
          <th scope="col">
            UniMelb 
          </th>
          <th scope="col">
            UNSW
          </th>
          <th scope="col">
            Charles University
          </th>
          <th scope="col">Technical University of Munich</th>
        </tr>
  </table>
}

export default function Home(props) {

  return (
    <div>
      <Head>
        <title>UniMelb CS Open Letter</title>
        <meta name="description" content="Addressing the failings of the UniMelb CS curricilum" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className='container'>
        <h1>
          University of Melbourne Computer Science - Open Letter
        </h1>
        <hr/>
        <div>
          <h2>Letter to the University of Melbourne Computer Science department regarding the quality of curricilum</h2>
          <p>Recent events present a troubled view on the breadth and depth of the CS curriculum at The University of Melbourne, particularly regarding postgraduate studies.</p> 
          <p>An incomplete list of fundamental computer science classes which have left the university and not been satisfactorily replaced are:</p>
        </div>
        <hr/>
        <h3>Below is a comparision of fundamental CS subjects</h3>
        <UniTable/>
        <hr/> 
        <h3>Below is the list of people who have signed this letter. You can also submit your signature here.</h3>
        <p>Anonymous names are verified to be real, however, they are not displayed in case this may affect the student or staff member negatively.</p>
        <ul>
          {signatures.map((sig, i) => {
            return (
              <li key={i}> 
                <dl>
                  {sig.anonymous && <dt>Anonymous: {sig.anonymous}</dt>}
                  {sig.name && <dt>Name: {sig.name}</dt>}
                  {sig.position && <dt>Position: {sig.position}</dt>}
                  {sig.affiliation && <dt>Affiliation: {sig.affiliation}</dt>}
                  {sig.degrees && <dt>Degrees: {sig.degrees.join(', ')}</dt>}
                </dl>
              </li>
            )
          })}
        </ul>
      </main>
    </div>
  )
}
