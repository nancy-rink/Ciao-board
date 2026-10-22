# Setting up Friends

Friends lets two Ciao Boards send messages to each other once both owners agree. Messages travel through a free Firebase project that you own. Setup takes about 15 minutes and only has to be done once, by whoever runs the site.

## 1. Create the project

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and sign in with your Google account.
2. Click **Create a project**, name it (for example `ciao-board`), and click through. You can turn Google Analytics off.
3. Stay on the free **Spark** plan. It allows 50,000 reads and 20,000 writes a day, far more than a few boards use.

## 2. Turn on anonymous sign-in

Each board signs in on its own without asking anyone for an account.

1. In the left menu, open **Build → Authentication** and click **Get started**.
2. On the **Sign-in method** tab, choose **Anonymous**, switch it on, and click **Save**.
3. On the **Settings** tab, open **Authorized domains**, click **Add domain**, and add `nancy-rink.github.io`.

## 3. Create the database

1. Open **Build → Firestore Database** and click **Create database**.
2. Pick a location near you (for example `eur3` for Europe or `nam5` for the US). It can't be changed later.
3. Choose **Start in production mode** and click **Create**.
4. Open the **Rules** tab, delete what's there, paste in everything from [`firestore.rules`](firestore.rules), and click **Publish**.

The rules make sure that:

- only boards that have both agreed to connect can message each other,
- only the board a message is addressed to can read it,
- invite codes can't be listed or guessed in bulk, work once, and expire after 24 hours,
- either board can disconnect at any time.

## 4. Connect the site to the project

1. Click the gear next to **Project Overview**, then **Project settings**.
2. Under **Your apps**, click the web icon (`</>`), name the app `Ciao Board`, leave Firebase Hosting unticked, and click **Register app**.
3. Copy the `firebaseConfig` object it shows. It looks like this:

   ```js
   const firebaseConfig = {
     apiKey: "AIza…",
     authDomain: "ciao-board.firebaseapp.com",
     projectId: "ciao-board",
     storageBucket: "ciao-board.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abc123"
   };
   ```

4. In `index.html`, find `const FIREBASE_CONFIG=null;` and replace `null` with the `{ … }` part, then publish the change.

These values aren't secret. They only identify the project, and the rules from step 3 decide what anyone can do with it.

## Optional: lock the key to your site

In the [Google Cloud console](https://console.cloud.google.com/apis/credentials), open the key named **Browser key (auto created by Firebase)**. Under **Application restrictions**, choose **Websites** and add `https://nancy-rink.github.io/*`. Other sites then can't use your key.

## Good to know

- A board's identity lives in its browser. If someone clears their browser data or opens the board in a different browser, it counts as a new board and needs to connect again.
- Names come from **Name your friends see** at the moment two boards connect. Renaming later doesn't change existing connections.
- Messages are deleted once they're shown or deleted on the receiving board.
