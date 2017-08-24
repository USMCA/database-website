const mongoose = require('mongoose'),
      _ = require('lodash'),
      Schema = mongoose.Schema,
      { difficultyEnum } = require('../constants');

const problemSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  statement: { type: String, required: true },
  answer: String,
  official_soln: [ { type: Schema.Types.ObjectId, ref: 'Solution' } ],
  alternate_soln: [ { type: Schema.Types.ObjectId, ref: 'Solution' } ],
  difficulty: { type: String, enum: _.values(difficultyEnum) },
  upvotes: [ { type: Schema.Types.ObjectId, ref: 'User' } ],
  downvotes: [ { type: Schema.Types.ObjectId, ref: 'User' } ],
  views: [ { type: Schema.Types.ObjectId, ref: 'User' } ],
  comments: [ { type: Schema.Types.ObjectId, ref: 'Comment' } ],
  created: { type: Date, required: true },
  updated: { type: Date, required: true }
});

problemSchema.pre('validate', function(next) {
  const now = new Date();
  if (!this.created) this.created = now;
  if (!this.updated) this.updated = now;
  next();
});

const Problem = mongoose.model('Problem', problemSchema);
module.exports = Problem;