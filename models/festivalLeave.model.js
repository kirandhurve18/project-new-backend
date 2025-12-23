const mongoose = require('mongoose');
const { default: slugify } = require('slugify');

const festivalLeaveSchema = new mongoose.Schema({
  festival_name: {
    type: String,
    required: true,
    trim: true
  },
  festival_slug: {
    type: String,
    required: true,
    trim: true,
    unique: true,
  },
  festival_date: {
    type: Date,
    required: true
  },
  is_every_year: {
    type: Boolean,
    default: false,
  },
  status: {
    type: Boolean,
    default: true,
  }
}, {
  timestamps: true 
});


// Auto-generate slug before save
festivalLeaveSchema.pre('validate', function(next) {
  if (this.festival && !this.festival_slug) {
    this.festival_slug = slugify(this.festival, { lower: true, strict: true });
  }
  next();
});

module.exports = mongoose.model('FestivalLeave', festivalLeaveSchema);
