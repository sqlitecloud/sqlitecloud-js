import { useState, useEffect, useCallback } from "react";
import getDbConnection from "../db/dbConnection";

const useTasks = (tag = null) => {
  const [taskList, setTaskList] = useState([]);

  const getTasks = useCallback(async () => {
    try {
      let result;
      if (tag) {
        result = await getDbConnection().sql(
          `
          SELECT tasks.*, tags.id AS tag_id, tags.name AS tag_name 
          FROM tasks 
          JOIN tasks_tags ON tasks.id = tasks_tags.task_id 
          JOIN tags ON tags.id = tasks_tags.tag_id 
          WHERE tag_name=?`,
          tag
        );
        setTaskList(result);
      } else {
        result = await getDbConnection().sql(`
          SELECT tasks.*, tags.id AS tag_id, tags.name AS tag_name 
          FROM tasks 
          JOIN tasks_tags ON tasks.id = tasks_tags.task_id 
          JOIN tags ON tags.id = tasks_tags.tag_id`);
        setTaskList(result);
      }
    } catch (error) {
      console.error("Error getting tasks", error);
    }
  }, [tag]);

  const updateTask = async (completedStatus, taskId) => {
    try {
      await getDbConnection().sql(
        "UPDATE tasks SET isCompleted=? WHERE id=? RETURNING *",
        completedStatus,
        taskId
      );
      getTasks();
    } catch (error) {
      console.error("Error updating tasks", error);
    }
  };

  const addTaskTag = async (newTask, tag) => {
    try {
      if (tag.id) {
        const addNewTask = await getDbConnection().sql(
          "INSERT INTO tasks (title, isCompleted) VALUES (?, ?) RETURNING *",
          newTask.title,
          newTask.isCompleted
        );
        addNewTask[0].tag_id = tag.id;
        addNewTask[0].tag_name = tag.name;
        setTaskList([...taskList, addNewTask[0]]);
        await getDbConnection().sql(
          "INSERT INTO tasks_tags (task_id, tag_id) VALUES (?, ?)",
          addNewTask[0].id,
          tag.id
        );
      } else {
        const addNewTaskNoTag = await getDbConnection().sql(
          "INSERT INTO tasks (title, isCompleted) VALUES (?, ?) RETURNING *",
          newTask.title,
          newTask.isCompleted
        );
        setTaskList([...taskList, addNewTaskNoTag[0]]);
      }
    } catch (error) {
      console.error("Error adding task to database", error);
    }
  };

  const deleteTask = async (taskId) => {
    try {
      await getDbConnection().sql("DELETE FROM tasks_tags WHERE task_id=?", taskId);
      const result = await getDbConnection().sql("DELETE FROM tasks WHERE id=?", taskId);
      console.log(`Deleted ${result.totalChanges} task`);
      getTasks();
    } catch (error) {
      console.error("Error deleting task", error);
    }
  };

  useEffect(() => {
    getTasks();
  }, [getTasks]);

  return {
    taskList,
    updateTask,
    addTaskTag,
    deleteTask,
    refreshTasks: getTasks,
  };
};

export default useTasks;
