let express = require('express')
let app = express()

app.use(express.json())

let {open} = require('sqlite')
let sqlite3 = require('sqlite3')
let path = require('path')
let bcrypt = require('bcrypt')
let jwt = require('jsonwebtoken')

let dbPath = path.join(__dirname, 'twitterClone.db')

let db = null

let id = 6

let initalizeDbandServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    })
    app.listen(3000, () => {
      console.log('Server Started')
    })
  } catch (e) {
    console.log(`Error: "${e.message}"`)
  }
}

module.exports = app

initalizeDbandServer()

let middleware1 = async (request, response, next) => {
  let jwtValue
  let token = request.header('authorization')
  if (token !== undefined) {
    jwtToken = token.split(' ')[1]
  }
  else{
    response.status(401)
    response.send('Invalid JWT Token')
  }
  if (jwtToken !== undefined) {
    jwt.verify(jwtToken, 'kirramaskiloriparri', async (error, payload) => {
      if (error) {
        response.status(401)
        response.send('Invalid JWT Token')
      } else {
        request.username = payload.username
        next()
      }
    })
  }
  else{
    response.status(401)
    response.send('Invalid JWT Token')
  }
}

// API 1

app.post('/register', async (request, response) => {
  let {username, name, password, gender} = request.body
  const checkUserQuery = `SELECT * FROM user WHERE username = "${username}";`
  let checkUserValue = await db.get(checkUserQuery)
  let hashedPassword = await bcrypt.hash(password, 10)

  if (password.length < 6) {
    // Scenario 2
    response.status(400)
    response.send('Password is too short')
  } else {
    if (checkUserValue === undefined) {
      // 200
      const addUserQuery = `INSERT INTO user VALUES (${
        id + 1
      },"${name}","${username}","${hashedPassword}","${gender}");`
      await db.run(addUserQuery)
      response.send('User created successfully')
      id = id + 1
    } else {
      // Scenario 1
      response.status(400)
      response.send('User already exists')
    }
  }
})

// API 2

app.post('/login/', async (request, response) => {
  let {username, password} = request.body
  let checkUserQuery = `SELECT * FROM user WHERE username = "${username}";`
  let checkUser = await db.get(checkUserQuery)
  if (checkUser === undefined) {
    response.status(400)
    response.send('Invalid user')
  } else {
    let checkPassword = await bcrypt.compare(password, checkUser.password)
    if (checkPassword === true) {
      let payload = {username: username}
      let jwtToken = jwt.sign(payload, 'kirramaskiloriparri')
      response.send({jwtToken})
    } else {
      response.status(400)
      response.send('Invalid password')
    }
  }
})

// API 3

app.get('/user/tweets/feed', middleware1, async (request, response) => {
  let {username} = request
  let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
  let userOne = await db.get(userOneQuery)
  let getUserQuery = `SELECT username,tweet,date_time as dateTime FROM (user INNER JOIN follower ON user.user_id = follower.follower_user_id) AS T INNER JOIN tweet ON T.following_user_id = tweet.user_id LIMIT 4;`
  let getUser = await db.all(getUserQuery)
  if (getUser === []) {
    response.status(400)
    response.send('')
  } else {
  }
  response.send(getUser)
})

// API 4

app.get('/user/following/', middleware1, async (request, response) => {
  let {username} = request
  let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
  let userOne = await db.get(userOneQuery)
  let getUserQuery = `SELECT T.name AS name FROM (user INNER JOIN follower ON user.user_id = follower.following_user_id) AS T WHERE T.follower_user_id = ${userOne.user_id};`
  let getUser = await db.all(getUserQuery)
  response.send(getUser)
})

// API 5

app.get('/user/followers/', middleware1, async (request, response) => {
  let {username} = request
  let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
  let userOne = await db.get(userOneQuery)
  let getUserQuery = `SELECT T.name AS name FROM (user INNER JOIN follower ON follower.following_user_id = user.user_id) AS T WHERE T.follower_user_id = ${userOne.user_id};`
  let getUser = await db.all(getUserQuery)
  response.send(getUser)
})

// API 6

app.get('/tweets/:tweetId/', middleware1, async (request, response) => {
  try {
    let {tweetId} = request.params
    let getTweetQuery = `SELECT tweet,count(like_id) as likes,count(reply) AS replies,date_time as dateTime FROM (tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id) AS T INNER JOIN like ON T.tweet_id = like.tweet_id WHERE T.tweet_id = ${tweetId};`
    let getTweet = await db.all(getTweetQuery)
    response.send(getTweet)
  } catch (e) {
    response.status(401)
    response.send('Invalid Request')
  }
})

// API 7
app.get('/tweets/:tweetId/likes/', middleware1, async (request, response) => {
  try {
    let {tweetId} = request.params
    let getTweetQuery = `SELECT like.user_id as userId FROM (tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id) WHERE tweet.tweet_id = ${tweetId};`
    let getTweet = await db.all(getTweetQuery)
    let array = []
    for (let eachValue of getTweet) {
      let getUserQuery = `SELECT name FROM user WHERE user_id = ${eachValue.userId};`
      let getUser = await db.get(getUserQuery)
      array.push(getUser.name)
    }
    response.send({likes: array})
  } catch (e) {
    response.status(401)
    response.send('Invalid Request')
  }
})
