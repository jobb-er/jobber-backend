import { Server } from "socket.io";
import passport from "passport";

import server from "./server";
import session from "./session";
import {
  authenticationCheckSocket,
  authorizationCheckChat,
  authorizationCheckUser,
  chatNamespace,
  parseUserIdMiddleware,
  socketMiddlewareWrapper,
  userNamespace,
} from "../helpers/socket";
import chatOnConnection from "../socket/chat";
import userOnConnection from "../socket/user";
import corsConfig from "./cors";

const io = new Server(server, {
  path: "/socket.io/",
  cors: { ...corsConfig, methods: ["GET", "POST"] },
});

export const privateNamespace = io
  .of(userNamespace)
  .use(socketMiddlewareWrapper(session))
  .use(socketMiddlewareWrapper(passport.initialize()))
  .use(socketMiddlewareWrapper(passport.session()))
  .use(authenticationCheckSocket)
  .use(parseUserIdMiddleware)
  .use(authorizationCheckUser)
  .on("connection", userOnConnection);

export const conversationNamespace = io
  .of(chatNamespace)
  .use(socketMiddlewareWrapper(session))
  .use(socketMiddlewareWrapper(passport.initialize()))
  .use(socketMiddlewareWrapper(passport.session()))
  .use(authenticationCheckSocket)
  .use(authorizationCheckChat)
  .on("connection", chatOnConnection);

export default io;
