import { useState, useEffect } from 'react'
import getDbConnection from '../db/dbConnection'

const useCategories = () => {
  const [moreCategories, setMoreCategories] = useState(['Work', 'Personal'])

  const getCategories = async () => {
    let db = null;
    try {
      const tags = await db.sql('SELECT * FROM tags')
      const filteredTags = tags.filter(tag => {
        return tag['name'] !== 'Work' && tag['name'] !== 'Personal'
      })
      setMoreCategories(prevCategories => [...prevCategories, ...filteredTags.map(tag => tag.name)])
    } catch (error) {
      console.error('Error getting tags/categories', error)
    }
  }

  const addCategory = async newCategory => {
    let db = null;
    try {
      db = getDbConnection();
      await db.sql('INSERT INTO tags (name) VALUES (?) RETURNING *', newCategory)
      setMoreCategories(prevCategories => [...prevCategories, newCategory])
    } catch (error) {
      console.error('Error adding category', error)
    } finally {
      db?.close();
    }
  }

  const initializeTables = async () => {
    let db = null;
    try {
      db = getDbConnection();
      const createTasksTable = await db.sql(
        'CREATE TABLE IF NOT EXISTS tasks (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, title TEXT NOT NULL, isCompleted INT NOT NULL);'
      )

      const createTagsTable = await db.sql('CREATE TABLE IF NOT EXISTS tags (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, UNIQUE(name));')

      const createTagsTasksTable = await db.sql(
        'CREATE TABLE IF NOT EXISTS tasks_tags (id INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, task_id INTEGER NOT NULL, tag_id INTEGER NOT NULL, FOREIGN KEY (task_id) REFERENCES tasks(id), FOREIGN KEY (tag_id) REFERENCES tags(id));'
      )

      if (createTasksTable === 'OK' && createTagsTable === 'OK' && createTagsTasksTable === 'OK') {
        console.log('Successfully created tables')

        await db.sql('INSERT OR IGNORE INTO tags (name) VALUES (?)', 'Work')
        await db.sql('INSERT OR IGNORE INTO tags (name) VALUES (?)', 'Personal')
        getCategories()
      }
    } catch (error) {
      console.error('Error creating tables', error)
    } finally {
      db?.close();
    }
  }

  useEffect(() => {
    initializeTables()
  }, [])

  return {
    moreCategories,
    addCategory,
    getCategories
  }
}

export default useCategories
