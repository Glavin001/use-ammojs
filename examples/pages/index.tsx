import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import Link from 'next/link'
import styles from '../styles/Home.module.css'

const Home: NextPage = () => {
  return (
    <div className={styles.container}>
      <Head>
        <title>Use-Ammo.js</title>
        <meta name="description" content="Fast Physics hooks for use with react-three-fiber." />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <h1 className={styles.title}>
          Welcome to <a href="https://github.com/notrabs/use-ammojs">Use-Ammo.js!</a>
        </h1>

        <p className={styles.description}>
          Get started by trying the demos below from{' '}
          <code className={styles.code}>examples/</code>
        </p>

        <div className={styles.grid}>
          <a href="/stress" target="_blank" className={styles.card}>
            <h2>Stress &rarr;</h2>
            <p>Push the physics engine to the limits!</p>
            <ul>
              <li>
                <Link href="/stress?size=10&height=10&instanced=true">
                  <a target={"_blank"}>
                    1000 Instanced Boxes
                  </a>
                </Link>
              </li>
              <li>
                <Link href="/stress?size=10&height=10&instanced=false">
                  <a target={"_blank"}>
                    1000 Non-Instanced Boxes
                  </a>
                </Link>
              </li>
            </ul>
          </a>

          <a href="/hinges" target="_blank" className={styles.card}>
            <h2>Hinges &rarr;</h2>
            <p>Learn about constraints and other powerful features!</p>
          </a>

          <a
            href="/soft-bodies"
            className={styles.card}
            target="_blank"
          >
            <h2>Soft Bodies &rarr;</h2>
            <p>Adding soft body physics doesn&apos;t have to be hard.</p>
          </a>

          <a
            href="/vr"
            className={styles.card}
            target="_blank"
          >
            <h2>Virtual Reality &rarr;</h2>
            <p>
              Physics in WebXR written with React.
            </p>
          </a>

          <a
            href="/compound"
            className={styles.card}
            target="_blank"
          >
            <h2>Compound &rarr;</h2>
            <p>
              Create complex collision shapes with a compound shape.
            </p>
          </a>

          <a
            href="/gears"
            className={styles.card}
            target="_blank"
          >
            <h2>CSG Gears &rarr;</h2>
            <p>
              Add physics to Constructive Solid Geometry (CSG) objects.
            </p>
          </a>

        </div>
      </main>

      <footer className={styles.footer}>
        <a
          href="https://vercel.com?utm_source=create-next-app&utm_medium=default-template&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Powered by{' '}
          <span className={styles.logo}>
            <Image src="/vercel.svg" alt="Vercel Logo" width={72} height={16} />
          </span>
        </a>
      </footer>
    </div>
  )
}

export default Home
