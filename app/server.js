var connect = require('connect');
var serveStatic = require('serve-static');

/**
 * Configure the path where the web app is located 
 */
if (!process.env.BASE_PATH) {
    process.env.BASE_PATH = '/foo/';
}

connect()
    .use(process.env.BASE_PATH, serveStatic(__dirname))
    //.use(serveStatic(__dirname + "/images"))
    .listen(8080, function(){
        console.log('Server running on 8080...');
    });