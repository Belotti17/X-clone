import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'login': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'otp.create': { paramsTuple?: []; params?: {} }
    'verify.otp': { paramsTuple?: []; params?: {} }
    'otp.resend': { paramsTuple?: []; params?: {} }
    'timeline': { paramsTuple?: []; params?: {} }
    'timeline.following': { paramsTuple?: []; params?: {} }
    'tweets.store': { paramsTuple?: []; params?: {} }
    'tweets.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.like': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.retweet': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.reply': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.replies': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: [ParamValue?]; params?: {'username'?: ParamValue} }
    'profile.update': { paramsTuple?: []; params?: {} }
    'profile.followers': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile.following': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'follow.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'follow.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'search': { paramsTuple?: []; params?: {} }
    'search.hashtag': { paramsTuple: [ParamValue]; params: {'tag': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'login': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'otp.create': { paramsTuple?: []; params?: {} }
    'timeline': { paramsTuple?: []; params?: {} }
    'timeline.following': { paramsTuple?: []; params?: {} }
    'tweets.replies': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: [ParamValue?]; params?: {'username'?: ParamValue} }
    'profile.followers': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile.following': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'search': { paramsTuple?: []; params?: {} }
    'search.hashtag': { paramsTuple: [ParamValue]; params: {'tag': ParamValue} }
  }
  HEAD: {
    'login': { paramsTuple?: []; params?: {} }
    'new_account.create': { paramsTuple?: []; params?: {} }
    'otp.create': { paramsTuple?: []; params?: {} }
    'timeline': { paramsTuple?: []; params?: {} }
    'timeline.following': { paramsTuple?: []; params?: {} }
    'tweets.replies': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'profile.show': { paramsTuple?: [ParamValue?]; params?: {'username'?: ParamValue} }
    'profile.followers': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'profile.following': { paramsTuple: [ParamValue]; params: {'username': ParamValue} }
    'search': { paramsTuple?: []; params?: {} }
    'search.hashtag': { paramsTuple: [ParamValue]; params: {'tag': ParamValue} }
  }
  POST: {
    'new_account.store': { paramsTuple?: []; params?: {} }
    'session.store': { paramsTuple?: []; params?: {} }
    'verify.otp': { paramsTuple?: []; params?: {} }
    'otp.resend': { paramsTuple?: []; params?: {} }
    'tweets.store': { paramsTuple?: []; params?: {} }
    'tweets.delete': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.like': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.retweet': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'tweets.reply': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'follow.store': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
    'session.destroy': { paramsTuple?: []; params?: {} }
  }
  PUT: {
    'profile.update': { paramsTuple?: []; params?: {} }
  }
  DELETE: {
    'follow.destroy': { paramsTuple: [ParamValue]; params: {'id': ParamValue} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}