/*
 * Oni Apollo 'webapi/asana' module
 * Bindings to the Asana API
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 * (c) 2012 Oni Labs, http://onilabs.com
 *
 * This file is licensed under the terms of the MIT License:
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */
/**
  @module    webapi/asana
  @summary   Bindings to the [Asana](http://asana.com) API
  @home      sjs:webapi/asana
  @hostenv   nodejs
  @desc
    For more information about the Asana API, see http://developer.asana.com/documentation/

    ### Limitations:

     Because of Asana cross-domain policies, this module doesn't work in 
     the xbrowser host environment (yet).
*/

var http   = require("../http");
var sys    = require("builtin:apollo-sys"); 
var { merge } = require("../object");

/**
   @class    Client
   @summary  Asana API client
   @constructor Client
   @param    {String} [apiKey] [Asana API Key](http://developer.asana.com/documentation/#api_keys)
*/
function Client(apiKey) {
  this.apiKey = apiKey;
}
exports.Client = Client;
/**
   @function makeClient
   @summary  Shorthand for "`new Client(.)`".
   @param    {String} [apiKey] [Asana API Key](http://developer.asana.com/documentation/#api_keys)
*/
exports.makeClient = function(apiKey) { return new Client(apiKey); };

Client.prototype = {};

Client.prototype.request = function(method, path, opts) {
  opts = merge(
    {
      username: this.apiKey,
      password: "",
      method: method
    },
    opts);
  try {
    var rv = http.request(["https://app.asana.com/api/1.0/", path], opts);
  }
  catch (e){
    throw new Error("Asana API: "+e.status+" "+e.data);
  }
  return JSON.parse(rv).data;
};

//----------------------------------------------------------------------
// Workspaces

/**
   @function Client.listWorkspaces
   @summary Retrieve list of all reachable workspaces
   @return {Array} Array of `{id,name}` objects
   @desc
     Throws in error case. 
*/
Client.prototype.listWorkspaces = function() {
  return this.request("GET", "workspaces");
};

//----------------------------------------------------------------------
// Projects

/**
   @function Client.listProjects
   @summary Retrieve list of projects
   @param {optional Object} [settings] Hash of settings
   @setting {Boolean} [archived] If provided, this parameter will 
            filter on projects whose `archived` field takes on the specified value.
   @setting {String|Integer}  [workspace] If provided, this parameter will filter on projects
            which belong in the workspace with the specified id.
   @return {Array} Array of `{id,name}` objects
   @desc
     Throws in error case. 
*/
Client.prototype.listProjects = function(settings) {
  var params = {};
  if (settings) {
    if (typeof settings.archived != 'undefined') params.archived = settings.archived;
    if (typeof settings.workspace != 'undefined') params.workspace = settings.workspace;
  }

  return this.request("GET", ["projects", params]);
};

/**
   @function Client.getProject
   @summary Retrieve full record of project with given id
   @param   {String|Integer}  [id] Project ID
   @return  {Object} [ ] [Project record](http://developer.asana.com/documentation/#projects)
   @desc
     Throws in error case. 
*/
Client.prototype.getProject = function(id) {
  return this.request("GET", ["projects", ""+id]);
};

/**
   @function Client.modifyProject
   @summary Modify project with given id
   @param   {String|Integer} [id] Project ID
   @param   {Object} [data] Object with data to modify (see http://developer.asana.com/documentation/#projects)
   @return  {Object} Updated [project record](http://developer.asana.com/documentation/#projects)
 */
Client.prototype.modifyProject = function(id, data) {
  return this.request("PUT", ["projects", ""+id], {body:JSON.stringify({data:data})});
};

//----------------------------------------------------------------------
// Tasks

/**
   @function Client.listTasks
   @summary Retrieve list of tasks
   @param {optional Object} [settings] Hash of settings
   @setting {String|Integer} [assignee] The ID of the assignee to filter tasks on.
            Only unarchived tasks in the assignee's list will be returned. **Note:**
            If you specify an `assignee`, you must also specify a `workspace` to 
            filter on.
   @setting {String|Integer} [workspace] The ID of the workspace to filter tasks on. 
            **Note:** If you specify a `workspace`, you must also specify an `assignee`
            to filter on.
   @setting {String|Integer} [project] The ID of the project to get tasks from. 
            Only unarchived tasks in the project will be returned.
   @return {Array} Array of `{id,name}` objects
   @desc
     Throws in error case. 
*/
Client.prototype.listTasks = function(settings) {
  var params = {};
  if (settings) {
    for (var p in {'assignee':1, 'workspace':1, 'project':1}) {
      if (typeof settings[p] != 'undefined')
        params[p] = settings[p];
    }
  }
  return this.request("GET", ["tasks", params]);
};

/**
   @function Client.getTask
   @summary Retrieve full record of task with given id
   @param   {String|Integer}  [id] Task ID
   @return  {Object} [ ] [Task record](http://developer.asana.com/documentation/#tasks)
   @desc
     Throws in error case. 
*/
Client.prototype.getTask = function(id) {
  return this.request("GET", ["tasks", ""+id]);
};

/**
   @function Client.modifyTask
   @summary Modify task with given id
   @param   {String|Integer} [id] Task ID
   @param   {Object} [data] Object with data to modify (see http://developer.asana.com/documentation/#tasks)
   @return  {Object} Updated [task record](http://developer.asana.com/documentation/#tasks)
 */
Client.prototype.modifyTask = function(id, data) {
  return this.request("PUT", ["tasks", ""+id], {body:JSON.stringify({data:data})});
};

/**
   @function Client.createTask
   @summary  Create a new task
   @param   {Object|Integer} [workspace_id] ID of workspace to create task in
   @param   {Object} [data] Object with task data (see http://developer.asana.com/documentation/#tasks)
   @return  {Object} [ ] [Task record](http://developer.asana.com/documentation/#tasks)
 */
Client.prototype.createTask = function(workspace_id, data) {
  return this.request("POST", ["tasks",{workspace:""+workspace_id}], {body:JSON.stringify({data:data})});
};

/**
   @function Client.addTaskToProject
   @summary  Associate a task with a project
   @param   {Object|Integer} [task_id] ID of task
   @param   {Object|Integer} [project_id] ID of project
 */
Client.prototype.addTaskToProject = function(task_id, project_id) {
  return this.request("POST", ["tasks",""+task_id,"addProject"],{body:JSON.stringify({data:{project:""+project_id}})});
};

/**
   @function Client.removeTaskFromProject
   @summary  Dissociate a task from a project
   @param   {Object|Integer} [task_id] ID of task
   @param   {Object|Integer} [project_id] ID of project
 */
Client.prototype.removeTaskFromProject = function(task_id, project_id) {
  return this.request("POST", ["tasks",""+task_id,"removeProject"],{body:JSON.stringify({data:{project:""+project_id}})});
};


//----------------------------------------------------------------------
// Users

/**
   @function Client.listUsers
   @summary Retrieve list of users
   @param {optional Object} [settings] Hash of settings
   @setting {String|Integer} [workspace] If provided, this parameter will 
            filter on users in the specified workspace.
   @return {Array} Array of `{id,name}` objects
   @desc
     Throws in error case. 
*/
Client.prototype.listUsers = function(settings) {
  var params = {};
  if (settings) {
    if (typeof settings.workspace != 'undefined') params.workspace = settings.workspace;
  }

  return this.request("GET", ["users", params]);
};


/**
   @function Client.getUser
   @summary Retrieve full record of user with given id
   @param   {String|Integer}  [id] User ID
   @return  {Object}  [ ] [User record](http://developer.asana.com/documentation/#users)
   @desc
     Throws in error case. 
*/
Client.prototype.getUser = function(id) {
  return this.request("GET", ["users", ""+id]);
};

//----------------------------------------------------------------------
// Stories

/**
   @function Client.listStories
   @summary Retrieve list of stories for a task
   @param {String|Integer} [task_id] ID of task 
   @return {Array} Array of (compact) [story objects](http://developer.asana.com/documentation/#stories)
   @desc
     Throws in error case. 
*/
Client.prototype.listStories = function(task_id) {
  return this.request("GET", ["tasks", ""+task_id,"stories"]);
};

/**
   @function Client.getStory
   @summary Retrieve full record of story with given id
   @param   {String|Integer}  [id] Story ID
   @return  {Object}  [ ] [Story record](http://developer.asana.com/documentation/#stories)
   @desc
     Throws in error case. 
*/
Client.prototype.getStory = function(id) {
  return this.request("GET", ["stories", ""+id]);
};

/**
   @function Client.comment
   @summary Adds a comment to a task
   @param   {String|Integer}  [id] Task ID
   @param   {String} [text] Comment text
   @return  {Object}  [ ] [Story record](http://developer.asana.com/documentation/#stories)
   @desc
     Throws in error case. 
*/
Client.prototype.comment = function(id, text) {
  return this.request("POST", ["tasks", ""+id, "stories"],{body:JSON.stringify({data:{text:""+text}})});
};
