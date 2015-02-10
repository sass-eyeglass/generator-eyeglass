'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;
var mockery = require('mockery');
var os = require('os');

describe('eyeglass:app', function () {
  before(function (done) {
    mockery.enable({ warnOnUnregistered: false });
    mockery.registerMock('github', function () {
      return {
        user: {
          /* jshint -W106 */
          getFrom: function (data, cb) {
            cb(null, JSON.stringify({
              name: 'Tyrion Lannister',
              email: 'imp@casterlyrock.com',
              html_url: 'https://github.com/imp'
            }));
          }
          /* jshint +W106 */
        }
      };
    });

    helpers.run(path.join(__dirname, '../app'))
      .inDir(path.join(os.tmpdir(), './.tmp'))
      .withOptions({ 'skip-install': true })
      .withPrompt({
        githubUser: 'imp',
        generatorName: 'temp',
        sassType: 'scss'
      })
      .on('end', done);
  });

  after(function () {
    mockery.disable();
  });

  it('creates files', function () {
    assert.file([
      'package.json',
      '.editorconfig',
      '.jshintrc',
      'sass/index.scss'
    ]);
  });
});
