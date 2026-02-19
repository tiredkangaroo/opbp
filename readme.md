<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  </head>
  <body>
    <h1>what is opbp?</h1>
    <p>
      this game is a <b>work in progress</b>! there are significant changes to game mechanics to come. opbp is a
      turn-based (almost) strategy game where you fight a war against your opponent.
    </p>
    <h1>demo gameplay?</h1>
    <p>yeah! check it out <a href="https://github.com/tiredkangaroo/opbp/raw/refs/heads/main/assets/help/demo.mov">. the demo game was 23 minutes long (video has been sped up 10x).</p>
    <video controls style="width: 100%; height: auto">
      <source src="assets/help/demo.mov" />
      your browser does not support the video tag.
    </video>
    <h1>why is it called opbp?</h1>
    <p>
      this game was originally built in godot and it was titled "opb" because it was going to be a game where you play
      <a href="https://en.wikipedia.org/wiki/Operation_Barbarossa">Operation Barbarossa</a>. i chose to scale back the
      scope of the game, and when i switched to p5, i added a "p" because it was made in p5. <br /><br />
      the name is not final and i am open to suggestions!
    </p>
    <h1>how do i win/lose?</h1>
    <p>
      you win by taking control of your opponent's capital city for 10 rounds. you may also win by inflicting double the
      casualties on your opponent once your opponent has taken over a million casualties. <br /><br />
      you lose if your opponent does the same.
    </p>
    <h1>ok, what's going on?</h1>
    <img src="assets/help/1.png" alt="help diagram" style="width: 100%; height: auto" />
    <h2>the game</h2>
    we're playing as france, the country in blue. each country starts with six guard units surrounding their capital
    city.<br />
    <h2>units</h2>
    <p>
        each unit has a size, speed, attack, and stamina. all of these stats play a role in how the unit performs on the battlefield.
        <ul>
            <li>size is how many troops are in the unit</li>
            <li>speed is how fast a unit can move across the map</li>
            <li>attack is how much damage a unit can inflict on an enemy unit</li>
            <li>stamina affects how the unit degrades over time and in battle</li>
        </ul>
        about a unit:
        <ul>
            <li>they can move across the map</li>
            <li>they can attack enemy units when in contact</li>
            <li>you can merge nearby units to form a larger unit</li>
            <li>they don't always cover the target in just one round</li>
            <li>they degrade over time if in enemy territory and in battle</li>
            <li>they cost resources to deploy, maintain, and move</li>
            <li>upkeep for a unit is greater when it is in enemy territory</li>
            <li>it costs larger units more to move and upkeep</li>
            <li>hovering over a unit shows it in the Your Units panel</li>
        </ul>
    </p>
    <h2>the frontline</h2>
    <ul>
      <li>the frontline is the large black line.</li>
      <li>this line changes as your units move around the map.</li>
      <li>you lose by having your capital behind the frontline for 10 consecutive rounds.</li>
    </ul>
    this line is subject to a lot of change, both in the way it's visually represented, and it's signficance.
    <h2>rounds</h2>
    <ul>
        <li>the game is turn-based, and each turn is a round</li>
        <li>each round, you can deploy units, move units, and merge units</li>
        <li>at the end of each round, you gain resources, but you also lose some resources (see the Resources section)</li>
        <li>at the end of each round, if your capital is behind the frontline, you capital has been held. if you get 10 strikes, you lose.</li>
    </ul>
    <h2>resources</h2>
    <ul>
        <li>resources are shown in the bottom left corner</li>
        <li>resources are used to deploy units, maintain units (upkeep), and move units</li>
        <li>you gain resources over time, but every round you lose some resources (see the Rounds window)</li>
    </ul>
  </body>
</html>
