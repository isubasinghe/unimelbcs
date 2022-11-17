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

      <main>
        <h1 className={styles.title}>
          University of Melbourne Computer Science - Open Letter
        </h1>
        <h2>Open Letter to the University of Melbourne Computer Science department</h2>
      </main>
    </div>
  )
}
