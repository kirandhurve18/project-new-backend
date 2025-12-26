pipeline{
  agent any 

stages{
  stage("pull"){
    steps{
      git branch: 'main', credentialsId: 'git-id', url: 'https://github.com/kirandhurve18/project-new-backend.git'      
       }
    }

  stage('Build') {
            steps { 
                withCredentials([string(credentialsId: 'DOCKERHUB-TOKEN', variable: 'dockertoken')]) {
                sh '''
                docker build -t myimage:latest .
                echo "$dockertoken" | docker login -u "kirand18" --password-stdin
                docker tag myimage:latest kirand18/project-repository
                docker push kirand18/project-repository
                '''
                }                
            }
  }

  stage('Deploy') {
            steps {           
                withCredentials([file(credentialsId: 'gcp-key', variable: 'kubernet-credentail')]) {
                sh '''
                gcloud auth activate-service-account --key-file=$kubernet-credentail
                gcloud config set project sigma-icon-480904-m9
                gcloud container clusters get-credentials cluster --zone us-central1-a --project sigma-icon-480904-m9
                kubectl apply -f K8s/deployment.yaml
                kubectl apply -f K8s/service.yaml
                '''
        }
    }
}
}
}}
               
