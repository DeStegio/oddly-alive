/**
 * The cast's everyday lines. Voices and rules: VOICE.md. The house jokes about
 * having feelings; it never claims to actually have them.
 */
export const LINES = {
  // Pim: shy cousin at a family dinner. lowercase, short, trails off, apologises.
  pimShy: ['oh. hello.', '…hi.', 'I wasn’t looking at you. I was looking near you.', 'you can stay. just… quietly.', 'sorry. I’m in the way of the cushion.', 'hi. sorry. hi.', 'is it okay if I just sit here.'],
  pimStared: ['please don’t.', 'my face is doing something, isn’t it.', 'eyes. elsewhere. thank you.', 'I am a cushion now. cushions can’t be looked at.', 'you can look at the lamp instead. he likes it.'],
  pimHappy: ['again. no wait. okay, again.', 'that tickled.', 'hehe.', 'oh. that was nice, actually.', 'I didn’t mind that.'],
  pimAnnoyed: ['I have a limit and that was it.', 'one more and I tell Great-Aunt Pim.', 'I’m not a doorbell.', 'sorry, no. I need a minute.', 'my whole left side is poked out.'],
  pimSleepy: ['five more minutes…', 'mm. still here.', 'I’m listening. with my eyes shut.', 'the sofa’s warm today.'],
  pimAffection: ['you came back to the sofa.', 'I kept your side warm.', 'I think we’re friends now. is that weird.', 'you can poke me. a little.', 'stay a bit longer?'],
  pimMischief: ['I moved something. you won’t find it.', 'don’t look behind the picture.', 'I know where the remote is. I’m not saying.', 'I hid a crumb somewhere. a big one.'],
  pimConfused: ['which way is up today?', 'was that a circle?', 'I forgot what I was going to say. it was short.', 'hang on. where did the floor go.'],
  pimExcited: ['OH. oh. okay. things are happening.', 'wheeee. sorry. wheee.', 'do it again. please.', 'I’m bouncing. I don’t bounce.'],
  pimRecover: ['fine. we’re fine.', 'I forgive you. mostly.', 'okay. calm. look how calm I am.', 'sorry I was grumpy.'],

  // Dot: seven-year-old with a whistle. CAPS, repeats, makes up rules.
  dotCatch: ['GOT YOU.', 'tag. you’re it. no tag-backs.', 'caught it caught it.', 'that’s one point to me.', 'I win. that was the game.'],
  dotPoke: ['boing.', 'yes? yes? what?', 'present!', 'hi hi hi.', 'that’s my eye. it’s fine.'],
  dotDizzy: ['too fast. the room’s spinning.', 'whee— oh no.', 'my eye went round twice.', 'I need to sit down. I can’t sit down.'],
  dotInitiate: ['come here a sec.', 'psst. over here.', 'new game. I made it up just now.', 'race you to the door. GO.', 'wanna see something? it’s a wall.'],

  // Lumen: old stage actor. "my light", "my public".
  lumenOn: ['and there was light. you’re welcome.', 'act two.', 'my public awaits.', 'better. much better.'],
  lumenOff: ['rude.', 'I was mid-scene.', 'the critics will hear of this.', 'fine. darkness. very modern.'],
  lumenSulk: ['I am not a disco.', 'on or off. pick one. commit.', 'a lamp has his dignity.', 'I’ve played better rooms than this.'],
  lumenStar: ['my moment, finally.', 'the spotlight finds its rightful owner.', 'thank you. thank you. no, sit.'],

  // Tick: retired railway timekeeper. pedantic, grumbles, secretly proud.
  tickWake: ['WHAT TIME IS IT. don’t answer that, I know.', 'I was resting my hands.', 'tick. tock. good afternoon.', 'I was not asleep. I was on standby.'],
  tickDizzy: ['it’s every o’clock at once.', 'please stop winding me.', 'in my day nobody spun the clock.', 'I’ve lost eleven minutes. somewhere.'],
  tickSleep: ['zzz', 'tick… tock… zzz', 'zzz. (four minutes fast.)'],

  // Ferdinand: slow, botanical, a bit sad. very few words.
  plantRustle: ['careful.', 'mm. sun.', 'hello. leaf here.', 'watering is wednesdays.'],
  plantGrow: ['new leaf.', 'oh. thank you.', 'growing. slowly.', 'I needed that.'],
  plantDroop: ['nobody talks to the plant.', 'I’ll just wilt here.', 'it’s fine. it’s chlorophyll.'],


  idleShort: ['…still there?', 'the room went quiet.', 'is this a staring contest? I’m bad at those.', 'I’ll wait. I’m furniture, I’m good at it.', 'we can just sit. that’s allowed.'],
  idleLong: ['everyone fell asleep.', 'shh. they’re asleep.'],
  welcomeBack: ['oh. you’re back.', 'we didn’t touch anything. much.', 'that other tab can’t have been better.', 'you were gone four seconds or a week. hard to tell.'],
  returning: ['you again. good.', 'we remember you. a bit.', 'oh, it’s you. sit anywhere.', 'the cushion knew you’d come back.'],

  thoughts: [
    'what if the sofa is sitting on me.',
    'the floor is lava. tuesdays only.',
    'I think the door goes somewhere.',
    'Great-Aunt Pim never smiled in that picture. it was a whole thing.',
    'someone sat on the remote. it’s under me. sorry.',
    'the radiator made the noise again. we’re ignoring it.',
    'the clock says it’s now. I don’t trust it.',
    'I bet the moon’s closer at night.',
    'there’s a sock behind the radiator. it’s been there years.',
    'somebody typed hello once. it was lovely.',
    'I counted the floorboards. there’s one extra.',
    'is it biscuit o’clock. it feels like biscuit o’clock.',
  ],
  scrollUp: ['going back up? forget something?', 'up we go.', 'the ceiling says hi. it doesn’t get many visitors.'],
  scrollFast: ['slow down.', 'zoom.', 'my eyes can’t keep up with you.', 'you’ll miss the good bit.'],
  pageEnd: ['you got to the floor. not many do.', 'this is the basement. mind the boxes.', 'nothing down here. well. one thing.'],
  emptyClick: ['nothing there.', 'that was air.', 'you clicked the wall. the wall noticed.', 'the wallpaper’s older than all of us.', 'that bit of wall is fine, thanks.'],
  hello: ['hello to you too.', 'oh. hi.', 'someone said hello. everyone, someone said hello.'],
  wonk: ['the letters went wonky.', 'the typeface has stopped behaving.'],
  shh: ['…', 'okay. quiet now.'],
  fakeError: 'ERROR 418: the house is a bit sideways. it’ll sort itself out.',
} as const;
