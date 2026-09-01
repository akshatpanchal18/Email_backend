import bcrypt from "bcrypt";
class PasswordService {
  private static readonly SALT = 10;
  static async hash(secret: string): Promise<string> {
    return await bcrypt.hash(secret, this.SALT);
  }
  static async compare(secret: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(secret, hash);
  }
}
export default PasswordService;
