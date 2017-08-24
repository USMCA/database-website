const router = require('express').Router(),
      _ = require('lodash'),
      async = require('async'),
      auth = require('../config/auth'),
      handler = require('../utils/handler'),
      { requestTypes, requestEnum } = require('../constants');
const { REQUEST, ACCEPT, REJECT } = requestTypes;

const User = require('../database/user'),
      Competition = require('../database/competition'),
      Request = require('../database/request');

router.post('/', auth.verifyJWT, (req, res) => {
  const { type, competition, userId, requestId } = req.body;
  if (!competition.name) {
    handler(false, 'Competition name must be filled out.', 400)(req, res);
  }
  switch(type) {
    case REQUEST:
      /* see if contest with same name exists */
      Competition.findOne({ 
        name: { 
          $regex: new RegExp('^' + competition.name.toLowerCase(), 'i')
        }
      }, (err, existingCompetition) => {
        if (err) {
          return handler(false, 'Database failed to load competitions.', 503)(req, res);
        } else if (existingCompetition) {
          return existingCompetition.valid ?
            handler(false, 'A competition with that name already exists.', 400)(req, res) : 
            handler(false, 'A competition with that name is already being requested.', 400)(req, res);
        } else {
          /* find user who requested competition */
          User.findById(userId, (err, user) => {
            if (err) {
              return handler(false, 'Database failed to load author.', 503)(req, res);
            } else if (!user) {
              return handler(false, 'Author of competition request could not be found.', 400)(req, res);
            } else {
              /* create competition */
              const newCompetition = Object.assign(new Competition(), {
                ...competition,
                directors: [ user._id ] // make requester the first director
              });
              newCompetition.save(err => {
                if (err) {
                  console.log(err);
                  return handler(false, 'Database failed to create the competition.', 503)(req, res);
                } else {
                  /* create request */
                  const request = Object.assign(new Request(), {
                    author: user._id,
                    body: `${user.name} requests to create the competition \"${competition.name}\".`,
                    type: requestEnum.REQUEST,
                    competition: newCompetition._id
                  });
                  request.save(err => {
                    if (err) {
                      console.log(err);
                      return handler(false, 'Database failed to create the request.', 503)(req, res);
                    } else {
                      /* send request to admins of the site */
                      User.find({ admin: true }, (err, admins) => {
                        const tasks = admins.map(admin => {
                          return callback => {
                            admin.requests.push(request);
                            admin.save(err => {
                              if (err) callback(err, null);
                              else callback(null, null);
                            });
                          }
                        });
                        async.parallel(tasks, (err, results) => {
                          if (err) {
                            return handler(false, 'Database failed to send request to admins.', 503)(req, res);
                          } else {
                            /* success */
                            return handler(true, 'Successfully requested creation of competition.', 200)(req, res);
                          }
                        });
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
      break;
    case ACCEPT:
      if (!req.payload.admin) {
        return handler(false, 'Unauthorized access to requests.', 401)(req, res);
      }
      Request.findById(requestId).populate('competition').exec((err, request) => {
        if (err) {
          return handler(false, 'Competition request was not found.', 503)(req, res);
        } else {
          /* approve competition */
          request.competition.valid = true;
          request.competition.save(err => {
            if (err) {
              return handler(false, 'Database failed to approve competition.', 503)(req, res);
            } else {
              /* remove request from all admins */
              User.find({ admin: true }, (err, admins) => {
                const tasks = admins.map(admin => {
                  return callback => {
                    admin.requests = _.remove(admin.requests, adminRequest => {
                      return adminRequest._id === request._id;
                    });
                    admin.save(err => {
                      if (err) callback(err, null);
                      else callback(null, null);
                    });
                  };
                });
                async.parallel(tasks, (err, results) => {
                  if (err) {
                    return handler(false, 'Database failed to delete request from admins.', 503)(req, res);
                  } else {
                    /* remove request */
                    request.remove(err => {
                      if (err) {
                        return handler(false, 'Database failed to delete request.', 503)(req, res);
                      } else {
                        /* success */
                        return handler(true, 'Competition approved.', 200)(req, res);
                      }
                    });
                  }
                });
              });
            }
          });
        }
      });
      break;
    case REJECT:
      if (!req.payload.admin) {
        return handler(false, 'Unauthorized access to requests.', 401)(req, res);
      }
      Request.findById(requestId).populate('competition').exec((err, request) => {
        if (err) {
          return handler(false, 'Competition request was not found.', 503)(req, res);
        } else {
          /* delete competition */
          request.competition.remove(err => {
            if (err) {
              return handler(false, 'Failed to remove competition.', 503)(req, res);
            } else {
              /* remove request from all admins */
              User.find({ admin: true }, (err, admins) => {
                const tasks = admins.map(admin => {
                  return callback => {
                    admin.requests = _.remove(admin.requests, adminRequest => {
                      return adminRequest._id === request._id;
                    });
                    admin.save(err => {
                      if (err) callback(err, null);
                      else callback(null, null);
                    });
                  };
                });
                async.parallel(tasks, (err, results) => {
                  if (err) {
                    return handler(false, 'Database failed to delete request from admins.', 503)(req, res);
                  } else {
                    /* remove request */
                    request.remove(err => {
                      if (err) {
                        return handler(false, 'Database failed to delete request.', 503)(req, res);
                      } else {
                        /* success */
                        return handler(true, 'Competition rejected.', 200)(req, res);
                      }
                    });
                  }
                });
              });
            }
          });
        }
      });
      break;
    default:
      handler(false, 'Invalid competition post.', 400)(req, res);
      break;
  }
});

module.exports = router;