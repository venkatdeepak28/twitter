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
let tweetid = 11

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
  } else {
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
  } else {
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

app.get('/user/tweets/feed/', middleware1, async (request, response) => {
  let {username} = request
  let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
  let userOne = await db.get(userOneQuery)
  let getUserQuery = `select username,tweet,date_time as dateTime from (tweet inner join follower on tweet.user_id = follower.following_user_id) as T inner join user on T.following_user_id = user.user_id where follower.follower_user_id = ${userOne.user_id} ORDER BY dateTime DESC LIMIT 4;`
  let getUser = await db.all(getUserQuery)
  if (getUser === []) {
    response.status(400)
    response.send('Invalid ')
  } else {
    response.send(getUser)
  }
})

// API 4

app.get('/user/following/', middleware1, async (request, response) => {
  let {username} = request
  let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
  let userOne = await db.get(userOneQuery)
  let getUserQuery = `SELECT name 
    FROM follower INNER JOIN user
    ON follower.following_user_id = user.user_id
    WHERE follower_user_id = ${userOne.user_id};`
  let getUser = await db.all(getUserQuery)
  response.send(getUser)
})

// API 5

app.get('/user/followers/', middleware1, async (request, response) => {
  let {username} = request
  let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
  let userOne = await db.get(userOneQuery)
  let getUserQuery = `select name from follower INNER JOIN user ON user.user_id = follower.follower_user_id WHERE follower.following_user_id = ${userOne.user_id};`
  let getUser = await db.all(getUserQuery)
  response.send(getUser)
})

// API 6

app.get('/tweets/:tweetId/', middleware1, async (request, response) => {
  try {
    let {tweetId} = request.params
    let {username} = request
    let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
    let userOne = await db.get(userOneQuery)
    let checkIsFollowingQuery = `SELECT * from tweet inner join follower on tweet.user_id = follower.following_user_id where follower.follower_user_id = ${userOne.user_id} and tweet.tweet_id = ${tweetId};`
    let checkIsFollowing = await db.get(checkIsFollowingQuery)
    console.log(checkIsFollowing)
    if (checkIsFollowing === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      let {tweetId} = request.params
      let getTweetQuery = `SELECT tweet,count(like_id) as likes,count(reply) AS replies,date_time as dateTime FROM (tweet INNER JOIN reply ON tweet.tweet_id = reply.tweet_id) AS T INNER JOIN like ON T.tweet_id = like.tweet_id WHERE T.tweet_id = ${tweetId};`
      let getTweet = await db.all(getTweetQuery)
      response.send(getTweet)
    }
  } catch (e) {
    response.status(401)
    response.send('Invalid Request')
  }
})

// API 7
app.get('/tweets/:tweetId/likes/', middleware1, async (request, response) => {
  try {
    let {tweetId} = request.params
    let {username} = request
    let userOneQuery = `SELECT user_id FROM user WHERE username = "${username}";`
    let userOne = await db.get(userOneQuery)
    let checkIsFollowingQuery = `SELECT * from tweet inner join follower on tweet.user_id = follower.following_user_id where follower.follower_user_id = ${userOne.user_id} and tweet.tweet_id = ${tweetId};`
    let checkIsFollowing = await db.get(checkIsFollowingQuery)
    if (checkIsFollowing === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      let getTweetQuery = `SELECT like.user_id as userId FROM (tweet INNER JOIN like ON tweet.tweet_id = like.tweet_id) WHERE tweet.tweet_id = ${tweetId};`
      let getTweet = await db.all(getTweetQuery)
      let array = []
      for (let eachValue of getTweet) {
        let getUserQuery = `SELECT username FROM user WHERE user_id = ${eachValue.userId};`
        let getUser = await db.get(getUserQuery)
        array.push(getUser.username)
      }
      response.send({likes: array})
    }
  } catch (e) {
    response.status(401)
    response.send('Invalid Request')
  }
})

// API 8

app.get('/tweets/:tweetId/replies/', middleware1, async (request, response) => {
  let {tweetId} = request.params
  let {username} = request
  let getUserQuery = `SELECT user_id FROM user WHERE user.username = "${username}";`
  let getUser = await db.get(getUserQuery)
  let checkIsFollowingQuery = `SELECT * from tweet inner join follower on tweet.user_id = follower.following_user_id where follower.follower_user_id = ${getUser.user_id} and tweet.tweet_id = ${tweetId};`
  let checkIsFollowing = await db.get(checkIsFollowingQuery)
  if (checkIsFollowing === undefined) {
    response.status(401)
    response.send('Invalid Request')
  } else {
    let getTweetQuery = `SELECT name,reply FROM (reply INNER JOIN follower ON reply.user_id = follower.following_user_id) AS T INNER JOIN user ON user.user_id = T.user_id WHERE follower.follower_user_id = ${getUser.user_id} AND reply.tweet_id = ${tweetId}`
    let getReply = await db.all(getTweetQuery)
    if (getReply === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      let obj = {replies: getReply}
      response.send(obj)
    }
  }
})

// API 9

app.get('/user/tweets/', middleware1, async (request, response) => {
  let {username} = request
  let getUserQuery = `SELECT user_id FROM user WHERE user.username = "${username}";`
  let getUser = await db.get(getUserQuery)
  let getTweetIdQuery = `select tweet_id,tweet,date_time AS dateTime from (tweet INNER JOIN user on tweet.user_id = user.user_id) where user.user_id =  ${getUser.user_id};`
  let getTweetId = await db.all(getTweetIdQuery)

  let array = []

  for (let eachValue of getTweetId) {
    let value = {}
    let likesCountQuery = `select count(tweet.tweet_id) AS likes from (tweet INNER JOIN like on tweet.user_id = like.user_id) where tweet.tweet_id = ${eachValue.tweet_id};`
    let likesCount = await db.get(likesCountQuery)
    let replyCountQuery = `select count(reply.reply) AS replies from (tweet INNER JOIN reply on tweet.user_id = reply.user_id) where tweet.tweet_id = ${eachValue.tweet_id}`
    let replyCount = await db.get(replyCountQuery)
    value.tweet = eachValue.tweet
    value.likes = likesCount.likes
    value.replies = replyCount.replies
    value.dateTime = eachValue.dateTime
    array.push(value)
  }
  response.send(array)
})

//API 10

app.post('/user/tweets/', middleware1, async (request, response) => {
  try {
    let {username} = request
    let {tweet} = request.body
    let getUserQuery = `SELECT user_id FROM user WHERE user.username = "${username}";`
    let getUser = await db.get(getUserQuery)
    let addTweetQuery = `INSERT INTO tweet (tweet_id,tweet,user_id,date_time) VALUES (${
      tweetid + 1
    },"${tweet}",${getUser.user_id},"2021-04-07 18:05:36")`
    tweetid = tweetid + 1
    await db.run(addTweetQuery)
    response.send('Created a Tweet')
  } catch (e) {
    response.status(401)
    response.send(e.message)
  }
})

// APi 11

app.delete('/tweets/:tweetId/', middleware1, async (request, response) => {
  try {
    let {tweetId} = request.params
    let {username} = request
    let getUserQuery = `SELECT user_id FROM user WHERE user.username = "${username}";`
    let getUser = await db.get(getUserQuery)
    let checkIsHisTweetQuery = `SELECT * FROM tweet WHERE tweet_id = ${tweetId} AND user_id = ${getUser.user_id}`
    let checkIsHisTweet = await db.get(checkIsHisTweetQuery)
    if (checkIsHisTweet === undefined) {
      response.status(401)
      response.send('Invalid Request')
    } else {
      let deleteValueQuery = `DELETE FROM tweet WHERE user_id = ${getUser.user_id} AND tweet_id = ${tweetId};`
      await db.run(deleteValueQuery)
      response.send('Tweet Removed')
    }
  } catch (e) {
    response.send(401)
    response.send('Invalid Request')
  }
})
