/**
 * @Author: Zhengfeng.Yao <yzf>
 * @Date:   2017-06-07 17:37:42
 * @Last modified by:   yzf
 * @Last modified time: 2017-06-07 17:37:50
 */

import os from 'os';
import path from 'path';
import childProcess from 'child_process';

const executorsCount = os.cpus().length - 1;

function createExecutors(count) {
  const executors = [];
  let i = 0;
  while(executors.length < count) {
    i++;
    const executor = typeof v8debug === 'undefined' ?
      childProcess.fork(path.join(__dirname, './executor.js'))
      :
      childProcess.fork(path.join(__dirname, './executor.js'), [], {execArgv: [`--debug-brk=${10240 + i}`]});
    executor.setMaxListeners(1);
    executors.push(executor);
  }
  return executors;
}

module.exports = (function() {
  const executors = createExecutors(executorsCount);
  const tasksQueue = [];
  function launch(task) {
    const executor = executors.pop();
    const { callback } = task;
    executor.send(task);
    executor.once('message', result => {
      callback(null, result);
      executors.push(executor); // 任务完成
      if (tasksQueue.length > 0) {
        launch(tasksQueue.pop());
      }
    });
  }

  return {
    queue: task => {
      if (executors.length <= 0) {
        tasksQueue.push(task);
        return;
      }
      launch(task);
    },
    jobDone: () => executors.forEach(executor => executor.kill())
  }
})();
