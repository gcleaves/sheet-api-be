export interface IdTokenDto {
    name?: string,
    sub: string,
    iat: number,
    exp: number,
    family_name?: string,
    given_name?: string,
    email: string
}
