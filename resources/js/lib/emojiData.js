// Compact emoji list: "emoji keywords". Used by EmojiSheet (search + categories). No external package needed.
const RAW = {
  'Smileys': `😀 grin happy smile
😃 smile happy open
😄 laugh happy joy
😁 beam grin teeth
😆 laughing squint
😅 sweat nervous laugh relief
🤣 rofl lol rolling laugh
😂 joy tears laugh lol
🙂 slight smile
🙃 upside down silly
😉 wink
😊 blush happy shy
😇 angel innocent halo
🥰 love hearts adore
😍 heart eyes love
🤩 star struck wow
😘 kiss blow love
😗 kiss
😚 kiss closed eyes
😋 yum tasty delicious
😛 tongue
😜 wink tongue crazy
🤪 zany crazy wild
😝 tongue squint
🤑 money rich cash
🤗 hug
🤭 oops giggle hand mouth
🤫 shh quiet secret
🤔 think thinking hmm
🤐 zipper quiet
🤨 raised eyebrow doubt
😐 neutral
😑 expressionless
😶 no mouth silent
😏 smirk
😒 unamused
🙄 eye roll
😬 grimace awkward
😮‍💨 exhale relief sigh
🤥 liar lying
😌 relieved calm
😔 pensive sad
😪 sleepy
🤤 drool
😴 sleep tired zzz
😷 mask sick
🤒 sick fever
🤕 hurt bandage
🤢 nausea sick
🤮 vomit
🥵 hot sweat
🥶 cold freezing
🥴 woozy dizzy
😵 dizzy
🤯 mind blown shock
🤠 cowboy
🥳 party celebrate
😎 cool sunglasses
🤓 nerd
🧐 monocle curious
😕 confused
😟 worried
🙁 frown
☹️ sad frown
😮 wow surprised open mouth
😯 hushed
😲 astonished
😳 flushed embarrassed shy
🥺 pleading puppy eyes beg
🥹 holding back tears touched
😦 frown open
😧 anguish
😨 fear scared
😰 anxious sweat
😥 sad relieved
😢 cry sad tear
😭 sob crying loud
😱 scream shock fear
😖 confounded
😣 persevere
😞 disappointed
😓 downcast sweat
😩 weary tired
😫 tired exhausted
🥱 yawn bored
😤 triumph angry huff
😡 angry mad rage
😠 angry
🤬 swearing cursing angry
😈 devil smile evil
👿 angry devil
💀 skull dead
☠️ skull crossbones
💩 poop
🤡 clown
👻 ghost
👽 alien
🤖 robot
🙈 see no evil monkey
🙉 hear no evil monkey
🙊 speak no evil monkey`,
  'Gestures': `👍 thumbs up like yes ok good
👎 thumbs down dislike no bad
👌 ok perfect
🤌 pinched fingers italian
🤏 pinch small
✌️ peace victory
🤞 fingers crossed luck hope
🤟 love you
🤘 rock on
🤙 call me shaka
👈 point left
👉 point right
👆 point up
👇 point down
☝️ index up
✋ stop hand
🤚 raised back hand
🖐️ hand fingers
🖖 vulcan
👋 wave hello hi bye
🤝 handshake deal agreement
🙏 pray thanks please beg
🙌 raised hands celebrate hooray
👏 clap applause well done
🫶 heart hands love
🤲 palms up
👐 open hands
✍️ writing
💪 muscle strong flex
🦾 mechanical arm
🙋 raised hand
🤦 facepalm
🤷 shrug
🫡 salute
🫰 snap fingers
🫵 you pointing
🫂 hug people
👀 eyes look watching
👁️ eye
👅 tongue
👄 mouth lips
🧠 brain smart
🦷 tooth
👂 ear listen
👃 nose
💋 kiss lips
🫦 biting lip`,
  'Hearts': `❤️ red heart love
🧡 orange heart
💛 yellow heart
💚 green heart
💙 blue heart
💜 purple heart
🖤 black heart
🤍 white heart
🤎 brown heart
💔 broken heart sad
❣️ heart exclamation
💕 two hearts love
💞 revolving hearts
💓 beating heart
💗 growing heart
💖 sparkling heart
💘 heart arrow cupid
💝 gift heart
💯 hundred perfect score
💢 anger
💥 boom collision
💫 dizzy star
💦 sweat drops water
💨 dash wind fast
🔥 fire hot lit
✨ sparkles shine new
⭐ star
🌟 glowing star
⚡ lightning fast
🎉 party tada celebrate
🎊 confetti
🎈 balloon
🎁 gift present
🏆 trophy winner
🥇 gold medal first
🥈 silver second
🥉 bronze third
👑 crown king queen`,
  'People': `👶 baby
🧒 child
👦 boy
👧 girl
🧑 person
👨 man
👩 woman
🧔 beard
👴 old man
👵 old woman
👮 police
👷 construction worker
💂 guard
🕵️ detective
👩‍⚕️ doctor nurse
🧑‍🍳 cook chef
🧑‍🎓 student graduate
🧑‍🏫 teacher
🧑‍💻 developer coder
🧑‍🎤 singer
🧑‍🎨 artist
🧑‍🚀 astronaut
🦸 hero
🧙 wizard
🧚 fairy
👸 princess
🤴 prince
🤰 pregnant
🤱 breastfeeding
💃 dance woman
🕺 dance man
🚶 walk
🏃 run
🧘 yoga calm
🛀 bath
💅 nails polish slay
🤳 selfie
👗 dress
👚 blouse
👕 tshirt
👖 jeans
👔 tie
🧥 coat
👘 kimono
🥻 sari
👠 heels shoe
👟 sneaker shoe
👞 shoe
🥾 boot
👜 handbag
👛 purse
🎒 backpack
👓 glasses
🕶️ sunglasses
💍 ring
💎 diamond gem
👒 hat
🧢 cap
🎩 top hat`,
  'Animals': `🐶 dog puppy
🐱 cat kitten
🐭 mouse
🐹 hamster
🐰 rabbit bunny
🦊 fox
🐻 bear
🐼 panda
🐨 koala
🐯 tiger
🦁 lion
🐮 cow
🐷 pig
🐸 frog
🐵 monkey
🐔 chicken
🐧 penguin
🐦 bird
🐤 chick
🦅 eagle
🦉 owl
🦇 bat
🐺 wolf
🐗 boar
🐴 horse
🦄 unicorn
🐝 bee
🦋 butterfly
🐌 snail
🐞 ladybug
🐢 turtle
🐍 snake
🐙 octopus
🦀 crab
🐠 fish
🐬 dolphin
🐳 whale
🦈 shark
🐘 elephant
🦒 giraffe
🦓 zebra
🐪 camel
🌸 blossom flower
🌹 rose flower
🌻 sunflower
🌴 palm tree
🌳 tree
🌿 herb leaf
🍀 clover luck
🍁 maple leaf
🌍 earth africa world
🌙 moon night
☀️ sun
🌈 rainbow
☁️ cloud
🌧️ rain
❄️ snow cold
🌊 wave ocean`,
  'Food': `🍎 apple
🍌 banana
🍉 watermelon
🍇 grapes
🍓 strawberry
🍑 peach
🍍 pineapple
🥭 mango
🥥 coconut
🍅 tomato
🌶️ pepper chili hot
🥑 avocado
🍆 eggplant
🥔 potato
🥕 carrot
🌽 corn
🍞 bread
🥐 croissant
🧀 cheese
🥚 egg
🍳 fried egg
🥞 pancakes
🥓 bacon
🍗 chicken leg
🍖 meat
🌭 hotdog
🍔 burger
🍟 fries
🍕 pizza
🌮 taco
🌯 burrito
🥗 salad
🍝 spaghetti pasta
🍜 noodles ramen
🍲 stew soup pot
🍛 curry rice jollof
🍚 rice
🍣 sushi
🍤 shrimp
🍦 ice cream
🍩 donut
🍪 cookie
🎂 birthday cake
🍰 cake
🍫 chocolate
🍬 candy
🍭 lollipop
☕ coffee tea hot
🍵 tea
🥤 drink soda
🍺 beer
🍻 cheers beers
🥂 cheers champagne toast
🍷 wine
🍹 cocktail
🥛 milk
💧 water drop`,
  'Activities': `⚽ football soccer
🏀 basketball
🏈 american football
⚾ baseball
🎾 tennis
🏐 volleyball
🏉 rugby
🎱 pool 8 ball
🏓 ping pong
🥊 boxing
🥋 martial arts
⛳ golf
🏋️ weights gym
🚴 cycling
🏊 swimming
🎮 game controller gaming
🕹️ joystick
🎯 target bullseye
🎲 dice
🧩 puzzle
🎤 microphone sing
🎧 headphones music
🎵 music note
🎶 music notes
🎸 guitar
🥁 drums
🎹 piano
🎺 trumpet
🎬 clapper movie film
📸 camera photo
📷 camera
🎥 video camera
📱 phone mobile
💻 laptop computer
⌨️ keyboard
🖥️ desktop
🖨️ printer
🔋 battery
💡 idea bulb
📚 books
📖 book read
✏️ pencil
📝 memo note
📌 pin
📎 paperclip
💼 briefcase
📦 package parcel delivery
🛍️ shopping bags
🛒 cart shopping
🏷️ tag price
💰 money bag
💵 dollar cash
💳 card payment
🏦 bank
📈 chart up growth
📉 chart down
🔔 bell notification
🔒 lock
🔑 key
⏰ alarm clock
⌛ hourglass`,
  'Travel': `🚗 car
🚕 taxi
🚌 bus
🏍️ motorbike okada
🚲 bicycle
🛵 scooter
🚚 truck delivery
✈️ plane flight
🚀 rocket
🚢 ship
🚆 train
🏠 home house
🏢 office building
🏥 hospital
🏫 school
⛪ church
🕌 mosque
🏖️ beach
🏝️ island
🏔️ mountain
🗺️ map
📍 location pin
🧭 compass
🌆 city
🌃 night city
🌅 sunrise
🎡 ferris wheel
🏟️ stadium
🛣️ road
⛽ fuel
🚦 traffic light
🚧 construction
🇳🇬 nigeria flag
🇬🇭 ghana flag
🇺🇸 usa flag
🇬🇧 uk flag
🇿🇦 south africa flag
🇰🇪 kenya flag
🏳️ white flag
🚩 flag red
✅ check done yes
❌ cross no wrong
⚠️ warning
❓ question
❗ exclamation
➕ plus
➖ minus
✔️ check mark
🔁 repeat
🆕 new
🆓 free
🔞 adults only
💬 speech bubble chat
💭 thought bubble
🗯️ anger bubble
💤 zzz sleep`,
}

export const EMOJI_CATEGORIES = Object.entries(RAW).map(([name, block]) => ({
  name,
  items: block.split('\n').map(line => {
    const i = line.indexOf(' ')
    return { e: line.slice(0, i), k: line.slice(i + 1).toLowerCase() }
  }),
}))

export const ALL_EMOJIS = EMOJI_CATEGORIES.flatMap(c => c.items)
