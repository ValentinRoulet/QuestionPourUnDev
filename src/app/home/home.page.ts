import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AlertController, IonicModule, LoadingController, ToastController } from '@ionic/angular';
import { isEmpty } from 'rxjs';
import { Question } from '../question';
import { QuestionServiceService } from '../question-service.service';
import { TextToSpeech } from '@capacitor-community/text-to-speech';
import { Preferences } from '@capacitor/preferences';
import { getHtmlTagDefinition } from '@angular/compiler';
import { Haptics, ImpactStyle } from '@capacitor/haptics';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {

  constructor(private alertCtrl: AlertController, private toastController: ToastController, private questionService: QuestionServiceService, private loadingCtrl: LoadingController) {
    this.getParams();
    this.getScorboard();
    
  }

  pseudo: string = "";
  difficulties: string[] = ['easy', 'medium', 'hard'];
  difficulty: string = this.difficulties[0];
  memo: boolean = false;
  error: boolean = false;
  answer: string = "";
  solutions: string[] = [];
  validForm: boolean = false;
  nbQuestionMax: number = 0;
  nbQuestion: number = 0;
  questions: Question[]=[];
  question: string = "";
  score: number = 0;
  endGame: boolean = false;
  public progress = 0;
  param: string[] = [];
  scores: string[] = [];
  public top1: string[] = [];
  public top2: string[] = [];
  public top3: string[] = [];

  //get saved params to the form
  async getParams() {
    this.param = JSON.parse((await Preferences.get({ key: 'remember' })).value || '{}')
    this.pseudo = this.param[0][<any>"value"];
    this.nbQuestionMax = parseInt(this.param[1][<any>"value"]);
    this.difficulty = this.param[2][<any>"value"];
  }

  //save params from form
  saveInformation() {
    const paramTemp = JSON.stringify([
      {
        id: "pseudo",
        value: this.pseudo
      },
      {
        id: "nbQuestion",
        value: this.nbQuestionMax
      },
      {
        id: "difficulty",
        value: this.difficulty
      }

    ])
    Preferences.set({
      key: 'remember',
      value: paramTemp,
    });
    
  };

  //save score into scoreboard
  saveScore(top: string, score: number, pseudo: string) {
    pseudo = pseudo.toUpperCase().trim();
    const key = top;
     top = JSON.stringify([
      {
        pseudo: pseudo,
        value: score,
      }]);


    Preferences.set({
      key: key,
      value: top,
    });

    
  };

  //get score from local file
  async getScorboard() {
    this.top1 = JSON.parse((await Preferences.get({ key: 'top1' })).value || '{}');
    this.top2 = JSON.parse((await Preferences.get({ key: 'top2' })).value || '{}');
    this.top3 = JSON.parse((await Preferences.get({ key: 'top3' })).value || '{}');
    if (this.top1.length === undefined) {
      this.initScoreboard();
    }
    
  }

  //add a score in scoreboard if he enter to top3
  scoreboard(score: number) {

    if (score >= parseInt(this.top1[0][<any>"value"])) {
    
      this.saveScore("top3", parseInt(this.top2[0][<any>"value"]), this.top2[0][<any>"pseudo"]);
      this.saveScore("top2", parseInt(this.top1[0][<any>"value"]), this.top1[0][<any>"pseudo"]);
      this.saveScore("top1", score, this.pseudo);
    }
    else if (score >= parseInt(this.top2[0][<any>"value"])) {
      
      this.saveScore("top3", parseInt(this.top2[0][<any>"value"]), this.top2[0][<any>"pseudo"]);
      this.saveScore("top2", score, this.pseudo);
    }
    else if (score >= parseInt(this.top3[0][<any>"value"])) {
      
      this.saveScore("top3", score, this.pseudo);
    }


  }

  //use when the form is pushed 
  async submitForm() {
    Haptics.impact({ style: ImpactStyle.Light });
    this.pseudo = this.pseudo.replace(/<[^>]*>/g, '');
    this.nbQuestionMax = Math.round(this.nbQuestionMax);
    if (this.memo == true) {
      this.saveInformation();
  }


    if (this.pseudo.length >= 3 && this.nbQuestionMax > 0) {
      await this.showLoading();
      this.validForm = true;
      await this.loadQuizz();
      

    }
    else {
      const toast = await this.toastController.create({
        message: 'Error into the form.',
        color: 'danger',
        duration: 1500,
        position: 'top',
      });

      await toast.present();
    }
  };

  //intialise scoreboard to 0 for everyone
  initScoreboard() {
    this.saveScore("top1", 0, "empty");
    this.saveScore("top2", 0, "empty");
    this.saveScore("top3", 0, "empty");
    this.getScorboard();
  }

  deleteScoreboard() {
    Preferences.remove({ key: 'top1' });
    Preferences.remove({ key: 'top3' });
    Preferences.remove({ key: 'top2' });
    console.log("Scoreboard deleted");
  }

  //Load all questions into questions with API REST
  loadQuizz() {

    this.questionService.getQuestions(this.difficulty, this.nbQuestionMax).subscribe({
      next: value => {
        
        if (value.response_code == 0) {
          this.remplaceCaractereHTML(value.results)
          this.questions = value.results;
          this.generateQuestion();

        }
        else {
        }
      },
      error: async err => {
        const toast = await this.toastController.create({
          message: 'Api connection down.',
          color: 'danger',
          duration: 1500,
          position: 'top',
        });

        await toast.present();
      },
      complete: () => {
        this.hideLoader();
      }

    });
  }

  //use when next question button is pushed
  async nextQuestion() {
    Haptics.impact({ style: ImpactStyle.Light });
    if (this.endGame) {
      this.scoreboard(this.score);
      this.getScorboard();

      const text =
        "<ul>" +
          "<li>" + this.top1[0][<any>"pseudo"] + " : " + this.top1[0][<any>"value"] + "</li>" +
          "<li>" + this.top2[0][<any>"pseudo"] + " : " + this.top2[0][<any>"value"] + "</li>" +
          "<li>" + this.top3[0][<any>"pseudo"] + " : " + this.top3[0][<any>"value"] + "</li>" +
        "</ul>";

      const alerte = await this.alertCtrl.create({
        "header": "Finish !",
        "subHeader": 'Scoreboard',
        "message": text + 'Your score :' + this.score,
        "buttons": [{
          text: 'Retry',
          role: 'retry',
          cssClass: 'alert-button-endGame',
          handler: () => {
            //this.questions = [];
            this.showLoading();
            this.loadQuizz();
            
          }
        },
          {
            text: 'Menu',
            cssClass: 'alert-button-endGame',
            handler: () => {
              this.validForm = false;
            }
          }],

      });
      alerte.present();

      this.score = 0;
      this.nbQuestion = 0
      this.endGame = false
    }
    else {
      this.nbQuestion++;
    }
    this.answer = "";
    this.progress = this.nbQuestion / this.nbQuestionMax;
    this.generateQuestion();

  };

  //use when a answer is send
  pushSolution(solution: string) {
    Haptics.impact({ style: ImpactStyle.Light });
    TextToSpeech.stop();
    this.answer = solution;
    if(this.answer == this.questions[this.nbQuestion].correct_answer) {
      this.score++;
      this.readText("Bien joué");
    }
    else {
      this.readText("Dommage");
      if(this.score > 0)
      {
        if (this.difficulty == "hard") {
          this.score = this.score - 1;
        }
        else if (this.difficulty == "medium") {
          this.score = this.score - 1;
          while (this.score < 0) {
            this.score++;
          }
        }
        else if (this.difficulty == "easy") {
          this.score = this.score - 1;
          while (this.score < 0) {
            console.log("oui")
            this.score++;
          }
        }
      }
    }
    
    this.solutions.forEach(a =>   'succes');


  }

  //Put question into var to display it
  generateQuestion() {
    this.question = decodeURI(this.questions[this.nbQuestion].question);
    this.solutions = [];
    this.solutions.push(this.questions[this.nbQuestion].correct_answer);
    this.questions[this.nbQuestion].incorrect_answers.forEach(answer => this.solutions.push(answer));
    this.solutions.sort((a, b) => 0.5 - 0 - Math.random());

    if (this.nbQuestion == this.questions.length - 1) {
      this.endGame = true;
    }
    this.readText(this.question);
    
  }

  //use to display the right color on answer when a user send a answer
  colorButton(oui: string) {
    var res: string = "warning";
    if (this.answer.length > 0) {
    if (oui == this.questions[this.nbQuestion].correct_answer) {
      
      res = "success";
    }
    else {
      res = "danger";
    }
    
    }
    return res;
  }


  public remplaceCaractereHTML(datas: Array<Question>) {

    // ForEach 

    for (let current of datas) {

      //l'expression régulière à remplacer 

      var regexp = /&quot;/gi;

      current.question = current.question.replace(regexp, "'");

      var regexp = /&&sup2;/gi;

      current.question = current.question.replace(regexp, "²");

      var regexp = /&AMP;/gi;

      current.question = current.question.replace(regexp, "&");

      var regexp = /&#039;/gi;

      current.question = current.question.replace(regexp, "'");


      var regexp = /&egrave;/gi;

      current.question = current.question.replace(regexp, "è");



      var regexp = /&eacute;/gi;

      current.question = current.question.replace(regexp, "é");
      var regexp = /&euml;/gi;
      current.question = current.question.replace(regexp, "ë");

    }

  }

  //logo is show when all question is not in var questions
  async showLoading() {
    const loading = await this.loadingCtrl.create({
      message: 'Loading...',
      
    });

    loading.present();
  }

  //hide the spin
  hideLoader() {
    setTimeout(() => {
      this.loadingCtrl.dismiss();
    }, 10);
  }

  //function to read a message with text to speech
  readText(message: string | undefined) {
    if (message) {
      TextToSpeech.speak({
        text: message,
        lang: 'en-US',
        rate: 1.0,
        pitch: 1.0,
        volume: 1.0,
        category: 'ambient',
      });
    }
  }



    
 }
