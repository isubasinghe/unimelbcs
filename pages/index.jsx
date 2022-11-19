import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'

export default function Home() {
  return (
    <div className={styles.container}>
      <Head>
        <title>UniMelb CS Open Letter</title>
        <meta name="description" content="Addressing the failings of the UniMelb CS curricilum" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          University of Melbourne Computer Science - Open Letter
        </h1>
        <div className={styles.textContainer}>
          <h2 className={styles.subtitle}>Letter to the University of Melbourne Computer Science department regarding the quality of curricilum</h2>
          <p className={styles.paragraph}>Recent events present a troubled view on the breadth and depth of the CS curriculum at The University of Melbourne, particularly regarding postgraduate studies.</p> 
          <p className={styles.paragraph}>An incomplete list of fundamental computer science classes which have left the university and not been satisfactorily replaced are:</p>
        </div>
      </main>
    </div>
  )
}
