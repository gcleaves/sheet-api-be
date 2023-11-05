import { SessionData } from "express-session"
import { User } from '../../users/user.entity';

declare module "express-session" {
    interface SessionData {
        user: User
    }
}
