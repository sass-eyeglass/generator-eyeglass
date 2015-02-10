'use strict';
var path = require('path');
var yeoman = require('yeoman-generator');
var url = require('url');
var chalk = require('chalk');
var yosay = require('yosay');
var npmName = require('npm-name');
var _ = require('lodash');
var _s = require('underscore.string');


// Grab a possible name for the eyeglass module.
var extractModuleName = function (appname) {
  var slugged = _s.slugify(appname);
  var match = slugged.match(/^eyeglass-(.+)/);

  if (match && match.length === 2) {
    return match[1].toLowerCase();
  }

  return slugged;
};

/* jshint -W106 */
var proxy = process.env.http_proxy || process.env.HTTP_PROXY || process.env.https_proxy ||
  process.env.HTTPS_PROXY || null;
/* jshint +W106 */
var githubOptions = {
  version: '3.0.0'
};

if (proxy) {
  var proxyUrl = url.parse(proxy);
  githubOptions.proxy = {
    host: proxyUrl.hostname,
    port: proxyUrl.port
  };
}

var GitHubApi = require('github');
var github = new GitHubApi(githubOptions);

if (process.env.GITHUB_TOKEN) {
  github.authenticate({
    type: 'oauth',
    token: process.env.GITHUB_TOKEN
  });
}

/* jshint -W106 */
var emptyGithubRes = {
  name: '',
  email: '',
  html_url: ''
};
/* jshint +W106 */

var githubUserInfo = function (name, cb, log) {
  github.user.getFrom({
    user: name
  }, function (err, res) {
    if (err) {
      log.error('Cannot fetch your github profile. Make sure you\'ve typed it correctly.');
      res = emptyGithubRes;
    }
    cb(JSON.parse(JSON.stringify(res)));
  });
};


module.exports = yeoman.generators.Base.extend({
  initializing: function () {
    this.pkg = require('../package.json');
  },

  prompting: {
    askFor: function () {
      var done = this.async();

      this.log(yosay(
        'Welcome to the ' + chalk.magenta('Sass Eyeglass') + ' generator!'
      ));

      var prompts = [{
        name: 'githubUser',
        message: 'Would you mind telling me your username on GitHub?',
        default: 'someuser'
      }];

      this.prompt(prompts, function (props) {
        this.githubUser = props.githubUser;

        done();
      }.bind(this));
    },

    askForModuleName: function () {
      var done = this.async();
      var moduleName = extractModuleName(this.appname);

      var prompts = [{
        name: 'moduleName',
        message: 'What\'s the base name of your generator?',
        default: moduleName
      }, {
        type: 'confirm',
        name: 'askNameAgain',
        message: 'The name above already exists on npm, choose another?',
        default: true,
        when: function (answers) {
          var done = this.async();
          var name = 'eyeglass-' + answers.moduleName;
          npmName(name, function (err, available) {
            if (!available) {
              done(true);
            }

            done(false);
          });
        }
      }];

      this.prompt(prompts, function (props) {
        if (props.askNameAgain) {
          return this.prompting.askForModuleName.call(this);
        }

        this.moduleName = props.moduleName;
        this.appname = 'eyeglass-' + this.moduleName;

        done();
      }.bind(this));
    },

    askSass: function() {
      var done = this.async;

      var prompts = [{
        type: 'list',
        name: 'sassType',
        message: 'Would you like to use the .scss or .sass syntax?',
        choices: ['sass', 'scss'],
        default: 'scss'
      }];

      this.prompt(prompts, function (props) {
        this.sassType = props.sassType;

        done();
      }.bind(this));
    }
  },

  configuring: {
    enforceFolderName: function () {
      if (this.appname !== _.last(this.destinationRoot().split(path.sep))) {
        this.destinationRoot(this.appname);
      }
      this.config.save();
    },

    userInfo: function () {
      var done = this.async();

      githubUserInfo(this.githubUser, function (res) {
        /*jshint camelcase:false */
        this.realname = res.name;
        this.email = res.email;
        this.githubUrl = res.html_url;
        done();
      }.bind(this), this.log);
    }
  },

  writing: {
    app: function () {
      this.fs.copyTpl(
        this.templatePath('_package.json'),
        this.destinationPath('package.json'),
          {
            slugAppname: _s.slugify(this.appname),
            githubUser: this.githubUser,
            realname: this.realname,
            email: this.email,
            githubUrl: this.githubUrl
          }
      );
    },

    projectfiles: function () {
      this.fs.copy(
        this.templatePath('editorconfig'),
        this.destinationPath('.editorconfig')
      );

      this.fs.copy(
        this.templatePath('jshintrc'),
        this.destinationPath('.jshintrc')
      );

      this.fs.copy(
        this.templatePath('eyeglass-exports.js'),
        this.destinationPath('eyeglass-exports.js')
      );

      this.fs.copy(
        this.templatePath('sass.' + this.sassType),
        this.destinationPath('sass/index.' + this.sassType)
      );
    }
  },

  install: function () {
    this.installDependencies({
      skipInstall: this.options['skip-install']
    });
  }
});
