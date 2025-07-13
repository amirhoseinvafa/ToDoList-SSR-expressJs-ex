import inquirer from "inquirer";
import DB from "./db.js";
import "dotenv";
import Task from "./task.js";
import chalk from "chalk";
import { parse, stringify } from "csv/sync";
import fs from "fs";
import axios from "axios";

const db = new DB();

const error = chalk.redBright.bold;
const warn = chalk.yellowBright.bold;
const success = chalk.greenBright.bold;

export default class Action {
  static list() {
    const tasks = DB.getAllTasks();

    if (tasks) {
      console.table(tasks);
    } else {
      console.log("there is not any tasks");
    }
  }

  static async add() {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "title",
        message: "what is yout titile?",
        validate: (value) => {
          if (value.length < 3) {
            return "The value must be smaller 3 letter!";
          }
          return true;
        },
      },
      {
        type: "confirm",
        name: "completed",
        message: "what is the status?",
        default: false,
      },
    ]);

    try {
      const task = new Task(answers.title, answers.completed);
      task.save();
      console.log(success("New task added!"));
    } catch (e) {
      console.lof(error(e.message));
    }
  }

  static async delete() {
    const tasks = Task.getAllTask();
    const choices = [];

    for (const task of tasks) {
      choices.push(task.title);
    }

    const answer = await inquirer.prompt({
      type: "list",
      name: "title",
      message: "select a task for delete",
      choices,
    });

    const task = Task.getTaskByTitle(answer.title);

    try {
      DB.deleteTask(task.id);
      console.log(success("task deleted"));
    } catch (e) {
      console.log(e.message);
    }
  }

  static async deleteAll() {
    const answer = await inquirer.prompt({
      type: "confirm",
      name: "deleteAll",
      default: false,
      message: "Are you sure!?!?",
    });

    if (answer.deleteAll) {
      try {
        DB.resetDB();
        console.log(success("All tesks deleted!"));
      } catch (e) {
        console.log(error(e.message));
      }
    }
  }

  static async edit() {
    const tasks = Task.getAllTask();
    const choices = [];

    for (const task of tasks) {
      choices.push(task.title);
    }

    const answers = await inquirer.prompt([
      {
        type: "list",
        name: "title",
        message: "select a tak you whant to edit",
        choices,
        validate: (value) => {
          if (value.length < 3) {
            return "The value must be smaller 3 letter!";
          }
          return true;
        },
      },
    ]);
    const task = Task.getTaskByTitle(answers.title);

    const answer2 = await inquirer.prompt([
      {
        type: "input",
        name: "title",
        message: `insert new title`,
        default: task.title,
      },
      {
        type: "confirm",
        name: "completed",
        message: "what is the status?",
        default: task.completed,
      },
    ]);

    try {
      DB.saveTask(answer2.title, answer2.completed, task.id);
      console.log(success("Your task is edited"));
    } catch (e) {
      console.log(error(e.message));
    }
  }

  static async export() {
    const answer = await inquirer.prompt({
      type: "input",
      name: "fileName",
      message: "what is yout fileName?",
      validate: (value) => {
        if (!/^[\w .-]{1,50}$/.test(value)) {
          return "Pleas enter a valid file name.";
        }
        return true;
      },
    });

    const tasks = DB.getAllTasks();
    const output = stringify(tasks, {
      header: true,
      cast: {
        boolean: (value) => {
          return String(value);
        },
      },
    });

    try {
      fs.writeFileSync(answer.fileName, output);
      console.log(success("export is succesfull"));
    } catch (e) {
      console.log("Can not write to" + answer.fileName);
    }
  }

  static async import() {
    const answer = await inquirer.prompt({
      type: "input",
      name: "fileName",
      message: "what is yout fileName?",
    });

    if (fs.existsSync(answer.fileName)) {
      try {
        const input = fs.readFileSync(answer.fileName);

        const data = parse(input, {
          columns: true,
          cast: (value, context) => {
            if (context.column === "id") {
              return Number(value);
            } else if (context.column === "completed") {
              return value.toLowerCase() === "true" ? true : false;
            }
            return value;
          },
        });

        DB.insertBulkData(data);
      } catch (e) {
        console.log(error(e.message));
      }
    } else {
      console.log(error("this file" + answer.fileName + "dose not exist"));
    }
  }

  static async download() {
    const baseURL = process.env.BASE_URL;

    const answer = await inquirer.prompt({
      type: "input",
      name: "fileName",
      message: "Enter your fileName to download:",
    });

    const config = {
      baseURL,
      url: answer.fileName,
    };

    try {
      const response = await axios(config);
      const data = parse(response.data, {
        columns: true,
        cast: (value, context) => {
          if (context.column === "id") {
            return Number(value);
          } else if (context.column === "completed") {
            return value.toLowerCase() === "true" ? true : false;
          }
          return value;
        },
      });
      DB.insertBulkData(data);
      console.log(success("Data Download is succesfully"));
      console.table(data);
    } catch (e) {
      console.log(error(e.message));
    }
  }
}
