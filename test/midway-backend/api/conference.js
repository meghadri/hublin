'use strict';

var expect = require('chai').expect,
    request = require('supertest'),
    apiHelpers = require('../../helpers/api-helpers.js');

describe.skip('The conference API', function() {
  var creator, attendee, user, conferenceId;

  var application;

  beforeEach(function(done) {
    this.testEnv.initCore(function() {
      var router = apiHelpers.getRouter('conferences');
      application = apiHelpers.getApplication(router);
      done();
    });
  });

  afterEach(function() {
    this.mongoose.connection.db.dropDatabase();
  });

  describe('GET /api/conferences/:id', function() {
    it('should send back 404 if the conference is not found', function(done) {
      request(application)
        .get('/api/conferences/54e5e86e65806d7c16764b79')
        .expect(404)
        .end(done);
    });

    it('should send back 500 if there is a server error', function(done) {
      request(application)
        .get('/api/conferences/123456')
        .expect(500)
        .end(done);
    });

    it('should send back 200 with the conference if it is found', function(done) {
      request(application)
        .get('/api/conferences/' + conferenceId)
        .expect(200)
        .end(function(err, res) {
          expect(err).to.not.exist;
          delete res.body.timestamps.creation;
          expect(res.body).to.deep.equal(
            {
              '__v': 0,
              '_id': conferenceId,
              'attendees': [
                {
                  'status': 'online',
                  'user': attendee._id.toString()
                }
              ],
              'creator': creator._id.toString(),
              'history': [],
              'schemaVersion': 1,
              'timestamps': {}
            });
          done();
        });
    });
  });

  describe('GET /api/conferences', function() {
    it('should send back 200 with the conference if it is found', function(done) {
      request(application)
        .get('/api/conferences')
        .expect(200)
        .end(function(err, res) {
          expect(err).to.not.exist;
          delete res.body[0].timestamps.creation;
          delete res.body[0].creator.timestamps.creation;

          expect(res.body).to.deep.equal([
            {
              '__v': 0,
              '_id': conferenceId,
              'attendees': [
                {
                  'status': 'online',
                  'user': attendee._id.toString()
                }
              ],
              'creator': {
                '__v': 0,
                '_id': creator._id.toString(),
                'emails': [
                  'jdoe@lng.net'
                ],
                'schemaVersion': 1,
                'timestamps': {}
              },
              'history': [],
              'schemaVersion': 1,
              'timestamps': {}
            }
          ]);
          done();
        });
    });
  });

  describe('POST /api/conferences', function() {
    it('should return 400 if req.body.email is not defined', function(done) {
      request(application)
        .post('/api/conferences')
        .send({})
        .expect(400)
        .end(done);
    });

    it('should return 400 if req.body.displayName is not defined', function(done) {
      request(application)
        .post('/api/conferences')
        .send({email: 'test@open-paas.org'})
        .expect(400)
        .end(done);
    });

    it('should return 500 if the email is not valid (simulating a server error)', function(done) {
      request(application)
        .post('/api/conferences')
        .send({email: 'test', displayName: 'JDoe'})
        .expect(500)
        .end(done);
    });

    it('should return 201 if the conference is correctly created', function(done) {
      request(application)
        .post('/api/conferences')
        .send({email: 'test@open-paas.org', displayName: 'JDoe'})
        .expect(201)
        .end(function(err, res) {
          expect(err).to.not.exist;
          expect(res.body._id).to.exist;
          var newConferenceId = res.body._id;

          request(application)
            .get('/api/conferences/' + newConferenceId)
            .expect(200)
            .end(function(err, res) {
              expect(err).to.not.exist;
              delete res.body.timestamps.creation;
              delete res.body.creator;
              delete res.body.attendees[0].user;
              delete res.body.history[0].user;
              delete res.body.history[0].date;
              expect(res.body).to.deep.equal(
                {
                  '__v': 0,
                  '_id': newConferenceId,
                  'attendees': [
                    {
                      'status': 'creator'
                    }
                  ],
                  'history': [
                    {
                      'status': 'creation'
                    }
                  ],
                  'schemaVersion': 1,
                  'timestamps': {}
                });
              done();
            });
        });
    });
  });

  describe('GET /api/conferences/:id/attendees', function() {
    it('should send back 404 if the conference is not found', function(done) {
      request(application)
        .get('/api/conferences/54e5e86e65806d7c16764b79/attendees')
        .expect(404)
        .end(done);
    });

    it('should send back 500 if there is a server error', function(done) {
      request(application)
        .get('/api/conferences/123456/attendees')
        .expect(500)
        .end(done);
    });

    it('should send back 200 and attendees of the conference', function(done) {
      request(application)
        .get('/api/conferences/' + conferenceId + '/attendees')
        .expect(200)
        .end(function(err, res) {
          expect(err).to.not.exist;
          delete res.body[0].timestamps.creation;
          expect(res.body).to.deep.equal([
            {
              '__v': 0,
              '_id': attendee._id.toString(),
              'emails': [
                'jdee@lng.net'
              ],
              'schemaVersion': 1,
              'timestamps': {}
            }
          ]);
          done();
        });
    });
  });

  describe('PUT /api/conferences/:id/attendees', function() {
    it('should send back 404 if the conference is not found', function(done) {
      request(application)
        .put('/api/conferences/54e5e86e65806d7c16764b79/attendees')
        .expect(404)
        .end(done);
    });

    it('should send back 500 if there is a server error', function(done) {
      request(application)
        .put('/api/conferences/123456/attendees')
        .expect(500)
        .end(done);
    });

    it('should send back 200 and new attendees of the conference with action=join', function(done) {
      request(application)
        .put('/api/conferences/' + conferenceId + '/attendees?action=join')
        .send({email: 'test@open-paas.org', displayName: 'JDoe'})
        .expect(200)
        .end(function(err, res) {
          request(application)
            .get('/api/conferences/' + conferenceId + '/attendees')
            .expect(200)
            .end(function(err, res) {
              expect(err).to.not.exist;
              delete res.body[0].timestamps.creation;
              delete res.body[1].timestamps.creation;
              delete res.body[1]._id;
              expect(res.body).to.deep.equal([
                {
                  '__v': 0,
                  '_id': attendee._id.toString(),
                  'emails': [
                    'jdee@lng.net'
                  ],
                  'schemaVersion': 1,
                  'timestamps': {}
                },
                {
                  '__v': 0,
                  'displayName': 'JDoe',
                  'emails': [
                    'test@open-paas.org'
                  ],
                  'schemaVersion': 1,
                  'timestamps': {}
                }
              ]);
              done();
            });
        });
    });

    it('should send back 500 with action=leave', function(done) {
      request(application)
        .put('/api/conferences/' + conferenceId + '/attendees?action=leave')
        .send({email: 'test@open-paas.org', displayName: 'JDoe'})
        .expect(500)
        .end(done);
    });
  });

  describe('PUT /api/conferences/:id/attendees/:user_id', function() {
    it('should send back HTTP 204 if all went ok', function(done) {
      request(application)
        .put('/api/conferences/' + conferenceId + '/attendees/' + user._id)
        .expect(204)
        .end(function(err, res) {
          request(application)
            .get('/api/conferences/' + conferenceId + '/attendees')
            .expect(200)
            .end(function(err, res) {
              expect(err).to.not.exist;
              delete res.body[0].timestamps.creation;
              delete res.body[1].timestamps.creation;
              delete res.body[1]._id;
              expect(res.body).to.deep.equal([
                {
                  '__v': 0,
                  '_id': attendee._id.toString(),
                  'emails': [
                    'jdee@lng.net'
                  ],
                  'schemaVersion': 1,
                  'timestamps': {}
                },
                {
                  '__v': 0,
                  'emails': [
                    'itadmin@lng.net'
                  ],
                  'schemaVersion': 1,
                  'timestamps': {}
                }
              ]);
              done();
            });
        });
    });
  });

});
