var axios = require('axios');

const get = async (url, body = null) => {
    if (body != null) {
        ESoptions.body = body;
    }
    try {
        var responseObject = await axios.get(url);
        var returnValue = await responseObject.data;
        return returnValue;

    } catch (error) {
        console.log(error);
    }
};

const post = async (url, body, headers) => {
    if (body == null)
        throw new Error('body cannot be empty');
    else if (headers == null)
        throw new Error('headers cannot be empty');
    else {
        var options = {
            'method': 'POST',
            'url': url,
            'headers': headers,
            'data': body
        };

        try {
            var responseObject = await axios.post(url, body, options);
            var returnValue = await responseObject.data;
            return returnValue;

        } catch (error) {
            console.log(error);
        }
    }
};

const put = async (url, body, headers) => {
    if (body == null)
        throw new Error('body cannot be empty');
    else if (headers == null)
        throw new Error('headers cannot be empty');
    else {
        var options = {
            'method': 'PUT',
            'url': url,
            'headers': headers,
            'data': body
        };

        try {
            var responseObject = await axios.put(url, body, options);
            var returnValue = await responseObject.data;
            return returnValue;

        } catch (error) {
            console.log(error);
        }
    }
};

exports.get = get;
exports.post = post;
exports.put = put;