// Test mail routes removed.
//
// This file used to expose three unauthenticated endpoints, one of which took
// any address as a parameter and sent from admin@longtermhire.com. Useful for
// proving the mail service worked; not something to leave on a live server,
// since anyone who found the address could send mail as us.
//
// The file itself stays so route loading is unaffected. To test mail again,
// add a route here temporarily behind TokenMiddleware and take it out after.

module.exports = function (app) {
  // deliberately nothing
};
