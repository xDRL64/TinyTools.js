const config = {

	ip   : '127.0.0.1',

	port : 3000,

	storage : './service_storage',

	mime : 'text/*', // MIME type to use between client and API.
	                 // api allows subtype of text type.

	case_sensitivity : false, // Used for session name checking
	                          // keep 'false' on windows file system
};

//

module.exports = config;