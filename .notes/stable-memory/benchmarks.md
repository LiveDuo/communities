## Heap

- create_post 26897, 25497 , 26432
- create_reply 32047, 29745, 29713
- get_posts 8589, 8589, 8589
- get_post 6470, 6470, 6470

1. get_post
   1. start to state 344
   2. state to get_posts 2051 *state.get_post*
   3. get_posts to post_opt 1975 *post.is_none*
   4. post_opt to end_get_replies 4160 *state.get_replies*
   5. end_get_replies to unwrap_post 1960 *post.unwrap*
   6. unwrap_post to end_post_result 3586 *let post_response*
   7. end_post_result to end 2009
   8. total 16085


2. create_reply
   1. start to state 258
   2. state to end_posts_contains 2329 *state.posts.contains*
   3. end_posts_contains to end_reply 2849 *let reply*
   4. end_reply to end_reply_id 24845 *uuid(caller)*
   5. end_reply_id to end_replies_insert 3455 *state.replies.insert*
   6. end_reply_id to end_insert_repletion 7261 *state.relations._.insert*
   7. end_insert_repletion to end_reply_response 1962 *let reply_response*
   8. end_reply_response to end  2077
   9. total 45036

## Stable Structures

- create_post 203818, 136511, 144733, 148217
- create_reply 160858, 186678, 205180
- get_posts 936643, 936643, 936643
- get_post 572204, 572204, 572204

1. get_post
 1. start to state 422
 (!) 2. state to get_posts 129602 -> *130k / 2k = 65x*
 3. get_posts to post_opt 2014
 (!) 4. post_opt to end_get_replies 116281 -> *116k / 4k = 27x*
 5. end_get_replies to unwrap_post 1640
 6. unwrap_post to end_post_result 2006
 7. end_post_result to end 2006
 8. total 253971

2. create_reply
   1. start to state 370
   2. state to end_posts_contains 131730 -> *131k / 2k = 56x*
   3. end_posts_contains to end_reply 2553
   4. end_reply to end_reply_id 19957
   5. end_reply_id to end_replies_insert 92440 -> *92k / 3k = 26x*
   6. end_reply_id to end_insert_repletion 34644 -> *34k / 7k = 4x*
   7. end_insert_repletion to end_reply_response 2031
   8. end_reply_response to end  2051
   9. total 285776

## stable-memory

- create_post 173838, 169657, 167266
- create_reply 163576, 148409, 147232
- get_posts 414396, 414396, 414396
- get_post 496089, 496089, 496089

1. get_post 
   1. start to state 257
   2. state to end_contains_posts 2369 -> ???
   3. end_contains_posts to end_get_replies 131606 -> *131k / 4k = 31x*
   4. end_contains_posts to end_get_post  2618 -> ???
   5. end_get_post to end_post_result 155256 -> ???
   6. end_post_result to end 2098
   7. total 294204

2. create_reply
   1. start to state 252
   2. state to end_posts_contains 2510 -> ???
   3. end_posts_contains to end_reply 2031
   4. end_reply to end_reply_id 24619
   5. end_reply_id to end_replies_insert 123846 -> *123k / 3k = 35x*
   6. end_reply_id to end_insert_repletion 21704 -> *21k / 7k = 3x*
   7. end_insert_repletion to end_reply_response 1987
   8. end_reply_response to end  2007
   9. total  178956

## stable-memory-generics

- create_post 173838, 169657, 167266
- create_reply 143859, 140229, 142614
- get_posts 418600, 418600, 418600
- get_post 155856, 155856, 155856

## stable-structures-increase-id

- create_post 185730, 249243, 260248
- create_reply 125455, 248262, 279656
- get_posts 494095, 494095, 494095
- get_post 452330, 452330, 452330