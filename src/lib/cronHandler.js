var cron = require('node-cron');
const createError = require('http-errors');
const {
  dbHandler,
} = require('./handler');
const { NODE_ENV } = require('./config');
const {
  Operators,
} = require('../models');


class cronHandler {
  constructor () {
    this.tasks = [
    ];
    this.instances = [];
  }

  getRandomInt (max) {
    return Math.floor(Math.random() * Math.floor(max))
  }
  sleep (seconds) {
    return new Promise(resolve => setTimeout(resolve, seconds * 1000));
  }
  sleepForRandomSeconds () {
    return this.sleep(this.getRandomInt(30));
  }

  run () {
    if (NODE_ENV == 'development') {
      console.log('Ignore setting up Cron Jobs - development env');
      return;
    }

    this.tasks.forEach((task) => {
      if (task.schedule) {
        this.instances.push({
          ...task,
          taskID: `task:${task.name}`,
          cronInstance: cron.schedule(task.schedule, (this[task.method])()),
        });
        if (task.callback) {
          (this[task.callback])();
        }
      }
    });
  }
};

module.exports = new cronHandler();
