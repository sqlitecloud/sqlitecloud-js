import styles from './page.module.css'

export default function Home() {
  return (
    <main className={styles.main}>
      <div className={styles.description}>
        next.js json route: <a href="/api/hello">app/api/hello/</a>
      </div>
    </main>
  )
}
