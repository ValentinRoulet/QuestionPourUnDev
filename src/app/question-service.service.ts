import { Injectable } from '@angular/core';
import { Question } from './question';
import { HttpClient } from '@angular/common/http';
import { Observable, catchError, of, retry } from 'rxjs'; 

@Injectable({
  providedIn: 'root'
})
export class QuestionServiceService {
  public questions: Question[] = [];
  constructor(private http: HttpClient) { }

  public getQuestions(diffuclty: String, nbQuestionMax: number): Observable<any> {
    let url = "https://opentdb.com/api.php?amount=" + nbQuestionMax + "&category=15&difficulty=" + diffuclty; //+ "&encode=urlLegacy";
    console.log(this.http

      .get<any>(url)

      .pipe(retry(1)));

    return this.http

      .get<any>(url)

      .pipe(retry(1), catchError(error => {

        console.error(error);

        throw new Error('QuestionService -- API REST Error');

      })); 
    

  }

}
