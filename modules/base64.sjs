/*
 * Oni Apollo 'base64' module
 * base64 encoding and decoding
 *
 * Part of the Oni Apollo Standard Module Library
 * Version: 'unstable'
 * http://onilabs.com/apollo
 *
 *
 * Notice from the original code:
 *
 *   This code was written by Tyler Akins and has been placed in the
 *   public domain.  It would be nice if you left this header intact.
 *   Base64 code from Tyler Akins -- http://rumkin.com
 *
 */

/**
  @module    base64
  @summary   base64 encoding and decoding
  @home      apollo:base64
  @deprecated Functionality has moved to [string::] module
  @desc
    ###Notice from the original code:

    This code was written by Tyler Akins and has been placed in the
    public domain.  It would be nice if you left this header intact.
    Base64 code from Tyler Akins -- http://rumkin.com
*/

/**
  @function encode
  @param {String} [input] String to encode
  @deprecated Use [string::octetsToBase64]
*/
exports.encode = require('./string').octetsToBase64;


/**
  @function decode
  @param {String} [input] String to decode
  @deprecated Use [string::base64ToOctets]
*/
exports.decode = require('./string').base64ToOctets;