const testCors = async () => {
    try {
        console.log('--- Testing CORS ---');

        const response = await fetch('http://localhost:3000/api/materials?limit=1', {
            method: 'GET',
            headers: {
                'Origin': 'http://localhost:5173'
            }
        });

        console.log('Status:', response.status);
        console.log('Access-Control-Allow-Origin:', response.headers.get('access-control-allow-origin'));

        if (response.ok) {
            console.log('CORS Request Successful');
        } else {
            console.log('CORS Request Failed');
            const text = await response.text();
            console.log('Response:', text);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
};

testCors();
